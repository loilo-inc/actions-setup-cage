import {getOctokit} from "@actions/github";
import * as tc from "@actions/tool-cache";
import * as core from "@actions/core";
import fetch from "node-fetch"

type Release = {
  tag_name: string;
};

export async function getLatestVersion(token: string) {
  const url = "https://api.github.com/repos/loilo-inc/canarycage/releases";
  if (token == "") {
    const res = await fetch(url);
    return parseBody(res.status, await res.json());
  } else {
    const res = await getOctokit(token).request(`GET ${url}`);
    return parseBody(res.status, await res.data);
  }
}

function parseBody(status: number, list: Release[]) {
  if (status == 200) {
    const regex = /^(\d+)\.(\d+)\.(\d+)$/;
    const versions = list
      .map((v) => v.tag_name)
      .filter((v) => v.match(regex))
      .sort((a, b) => b.localeCompare(a));
    return versions[0];
  } else {
    throw new Error(`Could not fetch versions: status=${status}`);
  }
}

export async function downloadCage({version}: { version: string }) {
  console.log("🥚 Installing cage...");
  const url = `https://github.com/loilo-inc/canarycage/releases/download/${version}/canarycage_linux_amd64.zip`
  const zip = await tc.downloadTool(url);
  const extracted = await tc.extractZip(zip);
  const installed = await tc.cacheDir(extracted, "cage", version);
  core.addPath(installed);
  console.log(`🐣 cage has been installed at '${installed}/cage'`);
}
