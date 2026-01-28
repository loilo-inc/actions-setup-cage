import type { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import os from "node:os";
export type Platform = `${string}_${string}`;
export type CageInfo = {
  version: string;
  checksumsUrl: string;
  assetUrl: string;
  assetName: string;
  isLatest: boolean;
};
export type Release =
  RestEndpointMethodTypes["repos"]["listReleases"]["response"]["data"][0];

export function getPlatform(): Platform {
  const platform = os.platform();
  let arch: string = os.arch();
  if (arch === "x64") {
    arch = "amd64";
  }
  return `${platform}_${arch}`;
}
