import { CageInfo } from "../type";

export const kMockPathfix = "/loilo-inc/canarycage/releases/download/";
export function makeTestCageInfo(
  p: Partial<CageInfo> & { version: string },
): CageInfo {
  return {
    checksumsUrl: `https://github.com${kMockPathfix}${p.version}/canarycage_${p.version}_checksums.txt`,
    assetUrl: `https://github.com${kMockPathfix}${p.version}/canarycage_linux_amd64.zip`,
    assetName: `canarycage_linux_amd64.zip`,
    isLatest: false,
    ...p,
  };
}
