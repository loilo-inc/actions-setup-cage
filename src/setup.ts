import * as core from "@actions/core";
import { getOctokit } from "@actions/github";
import * as tc from "@actions/tool-cache";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import semver from "semver";

export async function getLatestVersion({
  token,
  usePreRelease = false,
}: {
  token: string;
  usePreRelease?: boolean;
}) {
  const res = await getOctokit(token).rest.repos.listReleases({
    owner: "loilo-inc",
    repo: "canarycage",
  });
  if (res.status == 200) {
    const list = res.data
      .filter((v) => semver.valid(v.tag_name))
      .filter((v) => usePreRelease || !semver.prerelease(v.tag_name))
      .sort((a, b) => semver.rcompare(a.tag_name, b.tag_name));
    return list[0].tag_name;
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
  const platformArch = getPlatformArch();
  const list = await gh.rest.repos.listReleases({
    owner: "loilo-inc",
    repo: "canarycage",
  });
  const release = list.data.find((release) => release.tag_name === version);
  if (!release) throw new Error(`Version ${version} not found`);
  const asset = release.assets.find(
    (asset) => asset.name === `canarycage_${platformArch}.zip`,
  );
  const checksums = release.assets.find(
    (asset) => asset.name === `canarycage_${version}_checksums.txt`,
  );
  if (!checksums) throw new Error(`Checksums not found for ${version}`);
  if (!asset) throw new Error(`Asset not found for ${platformArch}`);
  const assetUrl = asset.browser_download_url;
  const checksumsUrl = checksums.browser_download_url;
  console.assert(
    assetUrl.startsWith("https://"),
    "asset.url is not secure: %s",
    assetUrl,
  );
  console.assert(
    checksumsUrl.startsWith("https://"),
    "checksumsUrl is not secure: %s",
    checksumsUrl,
  );
  const checksumsContent = await tc.downloadTool(checksumsUrl);
  const checksumEntries = await parseChecksum(checksumsContent);
  const hash = checksumEntries.get(asset.name);
  if (!hash) throw new Error(`Checksum not found for ${asset.name}`);
  const zip = await tc.downloadTool(assetUrl);
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

function getPlatformArch(): string {
  const platform = os.platform();
  let arch: string = os.arch();
  if (arch === "x64") {
    arch = "amd64";
  }
  return `${platform}_${arch}`;
}

export async function parseChecksum(
  file: string,
): Promise<Map<string, string>> {
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
