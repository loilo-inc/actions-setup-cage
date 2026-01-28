type _Core = typeof import("@actions/core");
type Core = Pick<_Core, "getInput" | "setFailed" | "info" | "warning">;
type _IO = typeof import("@actions/io");
type IO = Pick<_IO, "which">;
import { downloadCage } from "./download";
import { getPlatform } from "./type";
import { fetchReleases, getValidCandidate } from "./validator";

function assertInput(core: Core, name: string): string {
  const v = core.getInput(name);
  if (!v) {
    throw new Error(`${name} is required`);
  }
  return v;
}

export async function run({
  core,
  io,
  console,
}: {
  core: Core;
  io: IO;
  console: Console;
}) {
  try {
    const token = assertInput(core, "github-token");
    const usePreRelease = core.getInput("use-pre") === "true";
    const releases = await fetchReleases(token);
    const platform = getPlatform();
    const requiredVersion = core.getInput("cage-version");
    const cage = getValidCandidate({
      releases,
      platform,
      usePreRelease,
      requiredVersion,
    });
    if (!cage) {
      throw new Error("Could not find any valid release");
    }
    if (!requiredVersion) {
      core.info(`No version specified. Using latest version: ${cage.version}`);
    } else if (requiredVersion !== cage.version) {
      core.warning(
        `New version of cage found: current=${requiredVersion}, latest=${cage.version}`,
      );
    }
    const isInstalled = await io.which("cage", false);
    if (!isInstalled) {
      await downloadCage(cage);
    }
  } catch (e) {
    if (e instanceof Error) {
      console.error(e);
    }
    core.setFailed("see error above");
  }
}
