import * as tc from "@actions/tool-cache";
import * as core from "@actions/core";
import fetch from "node-fetch"

export async function getLatestVersion() {
  const url = "https://api.github.com/repos/loilo-inc/canarycage/releases";
  type Release = {
    tag_name: string;
  };
  const res = await fetch(url)
  if (res.status === 200) {
    const list: Release[] = await res.json()
    const regex = /^(\d+)\.(\d+)\.(\d+)$/;
    const versions = list
      .map((v) => v.tag_name)
      .filter((v) => v.match(regex))
      .sort((a, b) => b.localeCompare(a));
    return versions[0]
  } else {
    throw new Error(`Could not fetch versions: status=${res.status}`)
  }
}

export async function downloadCage({ version }: { version: string }) {
  console.log("🥚 Installing cage...");
  const url = `https://github.com/loilo-inc/canarycage/releases/download/${version}/canarycage_linux_amd64.zip`
  const zip = await tc.downloadTool(url);
  const extracted = await tc.extractZip(zip);
  const installed = await tc.cacheDir(extracted, "cage", version);
  core.addPath(installed);
  console.log(`🐣 cage has been installed at '${installed}/cage'`);
}
