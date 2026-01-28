import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { downloadCage, parseChecksum } from "./download";
import { kMockPathfix, makeTestCageInfo } from "./testdata/testing";

describe("downloadCage", () => {
  test("basic", async () => {
    const cage = makeTestCageInfo({ version: "0.2.0" });
    vi.spyOn(tc, "downloadTool").mockImplementation(async (u: string) => {
      const { pathname } = new URL(u);
      const p = pathname.replace(kMockPathfix, "");
      const tmp = os.tmpdir();
      const dest = path.resolve(tmp, path.basename(p));
      await fs.copyFile(path.resolve(__dirname, "testdata", p), dest);
      return dest;
    });
    vi.spyOn(tc, "extractZip").mockImplementation(async (file: string) => file);
    vi.spyOn(tc, "cacheDir").mockImplementation(async (dir: string) => dir);
    vi.spyOn(core, "addPath").mockImplementation(() => {});
    await downloadCage(cage);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should throw if version not found", async () => {
    const cage = makeTestCageInfo({ version: "0.4.0" });
    await expect(downloadCage(cage)).rejects.toThrow("ENOENT");
  });

  test("should throw if checksums not matched", async () => {
    const cage = makeTestCageInfo({ version: "0.2.0" });
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
    await expect(downloadCage(cage)).rejects.toThrow("Checksum mismatch:");
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
