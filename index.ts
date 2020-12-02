import * as core from "@actions/core";
import * as io from "@actions/io"
import {downloadCage, getLatestVersion} from "./src/setup";

async function main() {
  try {
    let version = core.getInput("cage-version");
    const latestVersion = await getLatestVersion()
    if (!version) {
      version = latestVersion
      core.info(`No version specified. Using latest version: ${version}`)
    } else if (version !== latestVersion) {
      core.warning(`New version of cage found: current=${version}, latest=${latestVersion}`)
    }
    if (!(await io.which("cage", false))) {
      await downloadCage({version});
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

if (require.main === module) {
  main();
}
