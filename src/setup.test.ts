import * as core from "@actions/core";
import * as github from "@actions/github";
import * as tc from "@actions/tool-cache";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { downloadCage, getLatestVersion, parseChecksum } from "./setup";

describe("getLatestVersions", () => {
  const list = [
    { tag_name: "2.1.0-rc1" }, // pre-release
    { tag_name: "2.0.0" },
    { tag_name: "2.0.0-rc1" },
    { tag_name: "1.0.0" },
    { tag_name: "0-0" }, // not a valid semver
  ];

  test.each([
    ["basic", false, "2.0.0"],
    ["pre-release", true, "2.1.0-rc1"],
  ])("%s", async (title, usePreRelease, exp) => {
    const mockOctokit = {
      rest: {
        repos: {
          listReleases: vi.fn().mockResolvedValue({
            status: 200,
            data: list,
          }),
        },
      },
    };
    vi.spyOn(github, "getOctokit").mockReturnValue(mockOctokit as any);

    const latest = await getLatestVersion({ token: "fake", usePreRelease });

    expect(mockOctokit.rest.repos.listReleases).toHaveBeenCalledWith({
      owner: "loilo-inc",
      repo: "canarycage",
    });
    expect(latest).toBe(exp);
  });

  test("should throw if status is not 200", async () => {
    const mockOctokit = {
      rest: {
        repos: {
          listReleases: vi.fn().mockResolvedValue({
            status: 500,
            data: {},
          }),
        },
      },
    };
    vi.spyOn(github, "getOctokit").mockReturnValue(mockOctokit as any);

    await expect(getLatestVersion({ token: "fake" })).rejects.toThrow(Error);

    expect(mockOctokit.rest.repos.listReleases).toHaveBeenCalledWith({
      owner: "loilo-inc",
      repo: "canarycage",
    });
  });
});

describe("downloadCage", () => {
  beforeEach(() => {
    const makeAsset = (version: string, name: string) => ({
      name,
      browser_download_url: `https://github.com/loilo-inc/canarycage/releases/download/${version}/${name}`,
    });

    const makeRelease = (tag_name: string) => ({
      tag_name,
      assets: [
        makeAsset(tag_name, "canarycage_linux_amd64.zip"),
        makeAsset(tag_name, "canarycage_darwin_arm64.zip"),
        makeAsset(tag_name, `canarycage_${tag_name}_checksums.txt`),
      ],
    });

    const mockOctokit = {
      rest: {
        repos: {
          listReleases: vi.fn().mockResolvedValue({
            status: 200,
            data: [
              makeRelease("0.2.1-rc1"),
              makeRelease("0.2.0"),
              makeRelease("0.1.0"),
            ],
          }),
        },
      },
    };
    vi.spyOn(github, "getOctokit").mockReturnValue(mockOctokit as any);
  });

  test("basic", async () => {
    vi.spyOn(tc, "downloadTool").mockImplementation(async (u: string) => {
      const { pathname } = new URL(u);
      const p = pathname.replace(
        "/loilo-inc/canarycage/releases/download/",
        "",
      );
      const tmp = os.tmpdir();
      const dest = path.resolve(tmp, path.basename(p));
      await fs.copyFile(path.resolve(__dirname, "testdata", p), dest);
      return dest;
    });
    vi.spyOn(tc, "extractZip").mockImplementation(async (file: string) => file);
    vi.spyOn(tc, "cacheDir").mockImplementation(async (dir: string) => dir);
    vi.spyOn(core, "addPath").mockImplementation(() => {});
    await downloadCage({ token: "fake", version: "0.2.0" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should throw if version not found", async () => {
    await expect(
      downloadCage({
        token: "fake",
        version: "0.4.0",
      }),
    ).rejects.toThrow("Version 0.4.0 not found");
  });
  test("should throw if checksums not matched", async () => {
    vi.spyOn(tc, "downloadTool").mockImplementation(async (u: string) => {
      const { pathname } = new URL(u);
      let p = pathname.replace("/loilo-inc/canarycage/releases/download/", "");
      if (p.endsWith("checksums.txt")) {
        p = p.replaceAll("0.2.0", "0.1.0");
      }
      const tmp = os.tmpdir();
      const dest = path.resolve(tmp, path.basename(p));
      await fs.copyFile(path.resolve(__dirname, "testdata", p), dest);
      return dest;
    });
    vi.spyOn(tc, "extractZip").mockImplementation(async (file: string) => file);
    vi.spyOn(tc, "cacheDir").mockImplementation(async (dir: string) => dir);
    vi.spyOn(core, "addPath").mockImplementation(() => {});
    await expect(
      downloadCage({
        token: "fake",
        version: "0.2.0",
      }),
    ).rejects.toThrow("Checksum mismatch:");
  });
});

describe("parseChecksum", () => {
  test("basic", async () => {
    const map = await parseChecksum(
      path.resolve(__dirname, "testdata/0.1.0/canarycage_0.1.0_checksums.txt"),
    );
    expect(map.get("canarycage_linux_amd64.zip")).toBe(
      "e00aeaebd63dc17194891514411426aa50ec51b1095fe85df927106184c71b47",
    );
    expect(map.get("canarycage_darwin_arm64.zip")).toBe(
      "e00aeaebd63dc17194891514411426aa50ec51b1095fe85df927106184c71b47",
    );
  });
});
