import { beforeEach, describe, expect, it, vi } from "vitest";
import * as setup from "./download";
import { run } from "./runner";
import * as type from "./type";
import * as validator from "./validator";

vi.mock("./setup");
vi.mock("./validator");
vi.mock("./type");

describe("run", () => {
  let mockCore: any;
  let mockIO: any;
  let mockLogger: any;

  beforeEach(() => {
    mockCore = {
      getInput: vi.fn(),
      setFailed: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    };
    mockIO = {
      which: vi.fn(),
    };
    mockLogger = {
      error: vi.fn(),
    };
    vi.clearAllMocks();
  });

  it("should successfully run with valid inputs and install cage", async () => {
    const mockToken = "test-token";
    const mockReleases = [{ version: "1.0.0" }] as type.Release[];
    const mockCage = { version: "1.0.0", url: "test-url" };

    mockCore.getInput.mockImplementation((name: string) => {
      if (name === "github-token") return mockToken;
      if (name === "use-pre") return "false";
      if (name === "cage-version") return "";
      return "";
    });
    mockIO.which.mockResolvedValue("");
    vi.mocked(validator.fetchReleases).mockResolvedValue(mockReleases);
    vi.mocked(type.getPlatform).mockReturnValue("linux_amd64");
    vi.mocked(validator.getValidCandidate).mockReturnValue(mockCage);
    vi.mocked(setup.downloadCage).mockResolvedValue(undefined);

    await run({ core: mockCore, io: mockIO, console: mockLogger });

    expect(validator.fetchReleases).toHaveBeenCalledWith(mockToken);
    expect(setup.downloadCage).toHaveBeenCalledWith(mockCage);
    expect(mockCore.info).toHaveBeenCalledWith(
      "No version specified. Using latest version: 1.0.0",
    );
  });

  it("should not download cage if already installed", async () => {
    mockCore.getInput.mockImplementation((name: string) => {
      if (name === "github-token") return "token";
      return "";
    });
    mockIO.which.mockResolvedValue("/usr/bin/cage");
    vi.mocked(validator.fetchReleases).mockResolvedValue([]);
    vi.mocked(type.getPlatform).mockReturnValue("linux_amd64");
    vi.mocked(validator.getValidCandidate).mockReturnValue({
      version: "1.0.0",
      url: "",
    });

    await run({ core: mockCore, io: mockIO, console: mockLogger });

    expect(setup.downloadCage).not.toHaveBeenCalled();
  });

  it("should warn when newer version is available", async () => {
    mockCore.getInput.mockImplementation((name: string) => {
      if (name === "github-token") return "token";
      if (name === "cage-version") return "1.0.0";
      return "";
    });
    mockIO.which.mockResolvedValue("");
    vi.mocked(validator.fetchReleases).mockResolvedValue([]);
    vi.mocked(type.getPlatform).mockReturnValue("linux_amd64");
    vi.mocked(validator.getValidCandidate).mockReturnValue({
      version: "2.0.0",
      url: "",
    });

    await run({ core: mockCore, io: mockIO, console: mockLogger });

    expect(mockCore.warning).toHaveBeenCalledWith(
      "New version of cage found: current=1.0.0, latest=2.0.0",
    );
  });

  it("should fail when github-token is missing", async () => {
    mockCore.getInput.mockReturnValue("");

    await run({ core: mockCore, io: mockIO, console: mockLogger });

    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockCore.setFailed).toHaveBeenCalledWith("see error above");
  });

  it("should fail when no valid release is found", async () => {
    mockCore.getInput.mockImplementation((name: string) => {
      if (name === "github-token") return "token";
      return "";
    });
    vi.mocked(validator.fetchReleases).mockResolvedValue([]);
    vi.mocked(type.getPlatform).mockReturnValue("linux_amd64");
    vi.mocked(validator.getValidCandidate).mockReturnValue(null);

    await run({ core: mockCore, io: mockIO, console: mockLogger });

    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockCore.setFailed).toHaveBeenCalledWith("see error above");
  });

  it("should handle use-pre flag", async () => {
    mockCore.getInput.mockImplementation((name: string) => {
      if (name === "github-token") return "token";
      if (name === "use-pre") return "true";
      return "";
    });
    mockIO.which.mockResolvedValue("/usr/bin/cage");
    vi.mocked(validator.fetchReleases).mockResolvedValue([]);
    vi.mocked(type.getPlatform).mockReturnValue("linux_amd64");
    vi.mocked(validator.getValidCandidate).mockReturnValue({
      version: "1.0.0",
      url: "",
    });

    await run({ core: mockCore, io: mockIO, console: mockLogger });

    expect(validator.getValidCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ usePreRelease: true }),
    );
  });
});
