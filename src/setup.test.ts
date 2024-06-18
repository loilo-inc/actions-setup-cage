import nock from "nock";
import { downloadCage, getLatestVersion, parseChecksum } from "./setup";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import * as tc from "@actions/tool-cache";
import * as core from "@actions/core";

describe("getLatestVersions", () => {
  test("basic", async () => {
    nock("https://api.github.com")
      .matchHeader("accept", "application/vnd.github.v3+json")
      .matchHeader("authorization", "token dummy")
      .get("/repos/loilo-inc/canarycage/releases")
      .reply(200, [
        { tag_name: "1.0.0" },
        { tag_name: "2.0.0" },
        { tag_name: "0-0" },
      ]);
    const latest = await getLatestVersion("dummy");
    expect(latest).toBe("2.0.0");
  });
  test("should throw if status is not 200", async () => {
    nock("https://api.github.com")
      .matchHeader("accept", "application/vnd.github.v3+json")
      .matchHeader("authorization", "token dummy")
      .get("/repos/loilo-inc/canarycage/releases")
      .reply(500, {});
    await expect(getLatestVersion("dummy")).rejects.toThrow(Error);
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
    nock("https://api.github.com")
      .matchHeader("accept", "application/vnd.github.v3+json")
      .matchHeader("authorization", "token dummy")
      .get("/repos/loilo-inc/canarycage/releases")
      .reply(200, [
        makeRelease("0.2.1-rc1"),
        makeRelease("0.2.0"),
        makeRelease("0.1.0"),
      ]);
  });
  test("basic", async () => {
    jest.spyOn(tc, "downloadTool").mockImplementation(async (u: string) => {
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
    jest
      .spyOn(tc, "extractZip")
      .mockImplementation(async (file: string) => file);
    jest.spyOn(tc, "cacheDir").mockImplementation(async (dir: string) => dir);
    jest.spyOn(core, "addPath").mockImplementation(() => {});
    await downloadCage({ token: "dummy", version: "0.2.0" });
  });

  test("should throw if version not found", async () => {
    await expect(
      downloadCage({
        token: "dummy",
        version: "0.4.0",
      }),
    ).rejects.toThrow("Version 0.4.0 not found");
  });
  test("should throw if checksums not matched", async () => {
    jest.spyOn(tc, "downloadTool").mockImplementation(async (u: string) => {
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
    jest
      .spyOn(tc, "extractZip")
      .mockImplementation(async (file: string) => file);
    jest.spyOn(tc, "cacheDir").mockImplementation(async (dir: string) => dir);
    jest.spyOn(core, "addPath").mockImplementation(() => {});
    await expect(
      downloadCage({
        token: "dummy",
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
