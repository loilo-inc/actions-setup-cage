import * as core from "@actions/core";
import * as io from "@actions/io"
import {downloadCage, getLatestVersion} from "./src/setup";

async function main() {
  const token = core.getInput("github-token");
  try {
    let version = core.getInput("cage-version");
    const latestVersion = await getLatestVersion(token)
    if (!version) {
      version = latestVersion
      core.info(`No version specified. Using latest version: ${version}`)
    } else if (version !== latestVersion) {
      core.warning(`New version of cage found: current=${version}, latest=${latestVersion}`)
    }
    if (!(await io.which("cage", false))) {
      await downloadCage({version});
    }
  } catch (e) {
    if (e instanceof Error) {
      console.error(e);
    }
    core.setFailed('see error above');
  }
}

if (require.main === module) {
  main();
}
