import { getOctokit } from "@actions/github";
import * as tc from "@actions/tool-cache";
import * as core from "@actions/core";
import os from "node:os";
import fs from "node:fs/promises";
import crypto from "node:crypto";

export async function getLatestVersion(token: string) {
  const res = await getOctokit(token).rest.repos.listReleases({
    owner: "loilo-inc",
    repo: "canarycage",
  });
  if (res.status == 200) {
    const list = res.data;
    const regex = /^(\d+)\.(\d+)\.(\d+)$/;
    const versions = list
      .map((v) => v.tag_name)
      .filter((v) => v.match(regex))
      .sort((a, b) => b.localeCompare(a));
    return versions[0];
  } else {
    throw new Error(`Could not fetch versions: status=${res.status}`);
  }
}

export async function downloadCage({
  version,
  token,
}: {
  token: string;
  version: string;
}) {
  console.log("🥚 Installing cage...");
  const gh = getOctokit(token);
  const platform = os.platform();
  const arch = os.arch();
  const list = await gh.rest.repos.listReleases({
    owner: "loilo-inc",
    repo: "canarycage",
  });
  const release = list.data.find((release) => release.tag_name === version);
  if (!release) throw new Error(`Version ${version} not found`);
  const asset = release.assets.find(
    (asset) => asset.name === `canarycage_${platform}_${arch}.zip`,
  );
  const checksums = release.assets.find(
    (asset) => asset.name === `canarycage_${version}_checksums.txt`,
  );
  if (!checksums) throw new Error(`Checksums not found for ${version}`);
  if (!asset) throw new Error(`Asset not found for ${platform}_${arch}`);
  console.assert(
    asset.url.startsWith("https://github.com/"),
    "asset.url is not valid: %s",
    asset.url,
  );
  console.assert(
    checksums.url.startsWith("https://github.com/"),
    "checksums.url is not valid: %s",
    checksums.url,
  );
  const checksumsContent = await tc.downloadTool(checksums.url);
  const checksumEntries = await parseChecksum(checksumsContent);
  const hash = checksumEntries.get(asset.name);
  if (!hash) throw new Error(`Checksum not found for ${asset.name}`);
  const zip = await tc.downloadTool(asset.url);
  const zipFile = await fs.open(zip, "r");
  const zipHash = await sha256hashAsync(zipFile.createReadStream());
  if (zipHash !== hash) {
    throw new Error(`Checksum mismatch: expected=${hash}, actual=${zipHash}`);
  }
  const extracted = await tc.extractZip(zip);
  const installed = await tc.cacheDir(extracted, "cage", version);
  core.addPath(installed);
  console.log(`🐣 cage has been installed at '${installed}/cage'`);
}

async function parseChecksum(file: string): Promise<Map<string, string>> {
  const buf = await fs.readFile(file, "utf-8");
  const entries: [string, string][] = buf
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash, filename] = line.split("  ");
      return [filename, hash];
    });
  return new Map(entries);
}

async function sha256hashAsync(stream: NodeJS.ReadableStream): Promise<string> {
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    hash.on("finish", () => resolve(hash.digest("hex")));
    hash.on("error", reject);
    stream.pipe(hash);
  });
}
