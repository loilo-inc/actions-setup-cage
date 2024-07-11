import * as core from "@actions/core";
import * as io from "@actions/io";
import { downloadCage, getLatestVersion } from "./src/setup";

function assertInput(name: string): string {
  const v = core.getInput(name);
  if (!v) {
    throw new Error(`${name} is required`);
  }
  return v;
}

async function main() {
  try {
    const token = assertInput("github-token");
    const usePreRelease = core.getInput("use-pre-release") === "true";
    let version = core.getInput("cage-version");
    const latestVersion = await getLatestVersion({ token, usePreRelease });
    if (!version) {
      version = latestVersion;
      core.info(`No version specified. Using latest version: ${version}`);
    } else if (version !== latestVersion) {
      core.warning(
        `New version of cage found: current=${version}, latest=${latestVersion}`,
      );
    }
    if (!(await io.which("cage", false))) {
      await downloadCage({ version, token });
    }
  } catch (e) {
    if (e instanceof Error) {
      console.error(e);
    }
    core.setFailed("see error above");
  }
}

if (require.main === module) {
  main();
}
