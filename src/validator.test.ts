import { describe, expect, test } from "vitest";
import { Release } from "./type";
import {
  getValidCandidate,
  isValidRelease,
  releaseToCageInfo,
} from "./validator";

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

describe("isValidRelease", () => {
  test("returns true for valid release with checksum and zip asset", () => {
    const release: Release = {
      tag_name: "1.0.0",
      assets: [
        { name: "canarycage_1.0.0_checksums.txt", browser_download_url: "" },
        { name: "canarycage_linux_amd64.zip", browser_download_url: "" },
      ],
    } as Release;
    expect(
      isValidRelease({
        release,
        usePreRelease: false,
        platform: "linux_amd64",
      }),
    ).toBe(true);
  });

  test("returns false for invalid semver", () => {
    const release: Release = {
      tag_name: "invalid-version",
      assets: [
        { name: "canarycage_1.0.0_checksums.txt", browser_download_url: "" },
        { name: "canarycage_linux_amd64.zip", browser_download_url: "" },
      ],
    } as Release;
    expect(
      isValidRelease({
        release,
        usePreRelease: false,
        platform: "linux_amd64",
      }),
    ).toBe(false);
  });

  test("returns false for prerelease when usePreRelease is false", () => {
    const release: Release = {
      tag_name: "1.0.0-beta.1",
      assets: [
        {
          name: "canarycage_1.0.0-beta.1_checksums.txt",
          browser_download_url: "",
        },
        { name: "canarycage_linux_amd64.zip", browser_download_url: "" },
      ],
    } as Release;
    expect(
      isValidRelease({
        release,
        usePreRelease: false,
        platform: "linux_amd64",
      }),
    ).toBe(false);
  });

  test("returns true for prerelease when usePreRelease is true", () => {
    const release: Release = {
      tag_name: "1.0.0-beta.1",
      assets: [
        {
          name: "canarycage_1.0.0-beta.1_checksums.txt",
          browser_download_url: "",
        },
        { name: "canarycage_linux_amd64.zip", browser_download_url: "" },
      ],
    } as Release;
    expect(
      isValidRelease({
        release,
        usePreRelease: true,
        platform: "linux_amd64",
      }),
    ).toBe(true);
  });

  test("returns false when checksum asset is missing", () => {
    const release: Release = {
      tag_name: "1.0.0",
      assets: [
        { name: "canarycage_linux_amd64.zip", browser_download_url: "" },
      ],
    } as Release;
    expect(
      isValidRelease({
        release,
        usePreRelease: false,
        platform: "linux_amd64",
      }),
    ).toBe(false);
  });

  test("returns false when zip asset is missing", () => {
    const release: Release = {
      tag_name: "1.0.0",
      assets: [
        { name: "canarycage_1.0.0_checksums.txt", browser_download_url: "" },
      ],
    } as Release;
    expect(
      isValidRelease({
        release,
        usePreRelease: false,
        platform: "linux_amd64",
      }),
    ).toBe(false);
  });

  test("returns false when platform-specific zip asset is missing", () => {
    const release: Release = {
      tag_name: "1.0.0",
      assets: [
        { name: "canarycage_1.0.0_checksums.txt", browser_download_url: "" },
        { name: "canarycage_darwin_arm64.zip", browser_download_url: "" },
      ],
    } as Release;
    expect(
      isValidRelease({
        release,
        usePreRelease: false,
        platform: "linux_amd64",
      }),
    ).toBe(false);
  });
});

describe("getValidCandidate", () => {
  test("returns latest valid release when no requiredVersion specified", () => {
    const releases: Release[] = [
      {
        id: 1,
        tag_name: "1.0.0",
        assets: [
          {
            name: "canarycage_1.0.0_checksums.txt",
            browser_download_url: "http://example.com/checksums.txt",
          },
          {
            name: "canarycage_linux_amd64.zip",
            browser_download_url: "http://example.com/linux.zip",
          },
        ],
      } as Release,
      {
        id: 2,
        tag_name: "2.0.0",
        assets: [
          {
            name: "canarycage_2.0.0_checksums.txt",
            browser_download_url: "http://example.com/checksums2.txt",
          },
          {
            name: "canarycage_linux_amd64.zip",
            browser_download_url: "http://example.com/linux2.zip",
          },
        ],
      } as Release,
    ];
    const result = getValidCandidate({ releases, platform: "linux_amd64" });
    expect(result?.version).toBe("2.0.0");
    expect(result?.isLatest).toBe(true);
  });

  test("returns specific version when requiredVersion is provided", () => {
    const releases: Release[] = [
      {
        id: 1,
        tag_name: "1.0.0",
        assets: [
          {
            name: "canarycage_1.0.0_checksums.txt",
            browser_download_url: "http://example.com/checksums.txt",
          },
          {
            name: "canarycage_linux_amd64.zip",
            browser_download_url: "http://example.com/linux.zip",
          },
        ],
      } as Release,
      {
        id: 2,
        tag_name: "2.0.0",
        assets: [
          {
            name: "canarycage_2.0.0_checksums.txt",
            browser_download_url: "http://example.com/checksums2.txt",
          },
          {
            name: "canarycage_linux_amd64.zip",
            browser_download_url: "http://example.com/linux2.zip",
          },
        ],
      } as Release,
    ];
    const result = getValidCandidate({
      releases,
      platform: "linux_amd64",
      requiredVersion: "1.0.0",
    });
    expect(result?.version).toBe("1.0.0");
    expect(result?.isLatest).toBe(false);
  });

  test("returns undefined when requiredVersion not found", () => {
    const releases: Release[] = [
      {
        id: 1,
        tag_name: "1.0.0",
        assets: [
          {
            name: "canarycage_1.0.0_checksums.txt",
            browser_download_url: "http://example.com/checksums.txt",
          },
          {
            name: "canarycage_linux_amd64.zip",
            browser_download_url: "http://example.com/linux.zip",
          },
        ],
      } as Release,
    ];
    const result = getValidCandidate({
      releases,
      platform: "linux_amd64",
      requiredVersion: "3.0.0",
    });
    expect(result).toBeUndefined();
  });

  test("returns undefined when no valid releases", () => {
    const releases: Release[] = [];
    const result = getValidCandidate({ releases, platform: "linux_amd64" });
    expect(result).toBeUndefined();
  });

  test("filters out prereleases when usePreRelease is false", () => {
    const releases: Release[] = [
      {
        id: 1,
        tag_name: "1.0.0-beta.1",
        assets: [
          {
            name: "canarycage_1.0.0-beta.1_checksums.txt",
            browser_download_url: "http://example.com/checksums.txt",
          },
          {
            name: "canarycage_linux_amd64.zip",
            browser_download_url: "http://example.com/linux.zip",
          },
        ],
      } as Release,
      {
        id: 2,
        tag_name: "1.0.0",
        assets: [
          {
            name: "canarycage_1.0.0_checksums.txt",
            browser_download_url: "http://example.com/checksums2.txt",
          },
          {
            name: "canarycage_linux_amd64.zip",
            browser_download_url: "http://example.com/linux2.zip",
          },
        ],
      } as Release,
    ];
    const result = getValidCandidate({
      releases,
      platform: "linux_amd64",
      usePreRelease: false,
    });
    expect(result?.version).toBe("1.0.0");
  });

  test("includes prereleases when usePreRelease is true", () => {
    const releases: Release[] = [
      {
        id: 1,
        tag_name: "1.0.0",
        assets: [
          {
            name: "canarycage_1.0.0_checksums.txt",
            browser_download_url: "http://example.com/checksums.txt",
          },
          {
            name: "canarycage_linux_amd64.zip",
            browser_download_url: "http://example.com/linux.zip",
          },
        ],
      } as Release,
      {
        id: 2,
        tag_name: "2.0.0-beta.1",
        assets: [
          {
            name: "canarycage_2.0.0-beta.1_checksums.txt",
            browser_download_url: "http://example.com/checksums2.txt",
          },
          {
            name: "canarycage_linux_amd64.zip",
            browser_download_url: "http://example.com/linux2.zip",
          },
        ],
      } as Release,
    ];
    const result = getValidCandidate({
      releases,
      platform: "linux_amd64",
      usePreRelease: true,
    });
    expect(result?.version).toBe("2.0.0-beta.1");
  });

  test("marks required version as latest when it matches highest version", () => {
    const releases: Release[] = [
      {
        id: 1,
        tag_name: "1.0.0",
        assets: [
          {
            name: "canarycage_1.0.0_checksums.txt",
            browser_download_url: "http://example.com/checksums.txt",
          },
          {
            name: "canarycage_linux_amd64.zip",
            browser_download_url: "http://example.com/linux.zip",
          },
        ],
      } as Release,
      {
        id: 2,
        tag_name: "2.0.0",
        assets: [
          {
            name: "canarycage_2.0.0_checksums.txt",
            browser_download_url: "http://example.com/checksums2.txt",
          },
          {
            name: "canarycage_linux_amd64.zip",
            browser_download_url: "http://example.com/linux2.zip",
          },
        ],
      } as Release,
    ];
    const result = getValidCandidate({
      releases,
      platform: "linux_amd64",
      requiredVersion: "2.0.0",
    });
    expect(result?.isLatest).toBe(true);
  });

  test("filters out releases with invalid semver", () => {
    const releases: Release[] = [
      {
        id: 1,
        tag_name: "invalid",
        assets: [
          {
            name: "canarycage_invalid_checksums.txt",
            browser_download_url: "http://example.com/checksums.txt",
          },
          {
            name: "canarycage_linux_amd64.zip",
            browser_download_url: "http://example.com/linux.zip",
          },
        ],
      } as Release,
      {
        id: 2,
        tag_name: "1.0.0",
        assets: [
          {
            name: "canarycage_1.0.0_checksums.txt",
            browser_download_url: "http://example.com/checksums2.txt",
          },
          {
            name: "canarycage_linux_amd64.zip",
            browser_download_url: "http://example.com/linux2.zip",
          },
        ],
      } as Release,
    ];
    const result = getValidCandidate({ releases, platform: "linux_amd64" });
    expect(result?.version).toBe("1.0.0");
  });
});
describe("releaseToCageInfo", () => {
  test("returns CageInfo with correct properties", () => {
    const release: Release = {
      tag_name: "1.0.0",
      assets: [
        {
          name: "canarycage_1.0.0_checksums.txt",
          browser_download_url: "http://example.com/checksums.txt",
        },
        {
          name: "canarycage_linux_amd64.zip",
          browser_download_url: "http://example.com/linux.zip",
        },
      ],
    } as Release;
    const result = releaseToCageInfo(release, true, "linux_amd64");
    expect(result.version).toBe("1.0.0");
    expect(result.checksumsUrl).toBe("http://example.com/checksums.txt");
    expect(result.assetUrl).toBe("http://example.com/linux.zip");
    expect(result.assetName).toBe("canarycage_linux_amd64.zip");
    expect(result.isLatest).toBe(true);
  });

  test("sets isLatest to false when specified", () => {
    const release: Release = {
      tag_name: "1.0.0",
      assets: [
        {
          name: "canarycage_1.0.0_checksums.txt",
          browser_download_url: "http://example.com/checksums.txt",
        },
        {
          name: "canarycage_linux_amd64.zip",
          browser_download_url: "http://example.com/linux.zip",
        },
      ],
    } as Release;
    const result = releaseToCageInfo(release, false, "linux_amd64");
    expect(result.isLatest).toBe(false);
  });

  test("throws error when checksum asset is missing", () => {
    const release: Release = {
      tag_name: "1.0.0",
      assets: [
        {
          name: "canarycage_linux_amd64.zip",
          browser_download_url: "http://example.com/linux.zip",
        },
      ],
    } as Release;
    expect(() => releaseToCageInfo(release, true, "linux_amd64")).toThrow(
      "Invalid release: 1.0.0",
    );
  });

  test("throws error when zip asset is missing", () => {
    const release: Release = {
      tag_name: "1.0.0",
      assets: [
        {
          name: "canarycage_1.0.0_checksums.txt",
          browser_download_url: "http://example.com/checksums.txt",
        },
      ],
    } as Release;
    expect(() => releaseToCageInfo(release, true, "linux_amd64")).toThrow(
      "Invalid release: 1.0.0",
    );
  });

  test("throws error when platform-specific zip asset is missing", () => {
    const release: Release = {
      tag_name: "1.0.0",
      assets: [
        {
          name: "canarycage_1.0.0_checksums.txt",
          browser_download_url: "http://example.com/checksums.txt",
        },
        {
          name: "canarycage_darwin_arm64.zip",
          browser_download_url: "http://example.com/darwin.zip",
        },
      ],
    } as Release;
    expect(() => releaseToCageInfo(release, true, "linux_amd64")).toThrow(
      "Invalid release: 1.0.0",
    );
  });

  test("works with different platforms", () => {
    const release: Release = {
      tag_name: "2.0.0",
      assets: [
        {
          name: "canarycage_2.0.0_checksums.txt",
          browser_download_url: "http://example.com/checksums.txt",
        },
        {
          name: "canarycage_darwin_arm64.zip",
          browser_download_url: "http://example.com/darwin.zip",
        },
      ],
    } as Release;
    const result = releaseToCageInfo(release, true, "darwin_arm64");
    expect(result.assetName).toBe("canarycage_darwin_arm64.zip");
    expect(result.assetUrl).toBe("http://example.com/darwin.zip");
  });
});
