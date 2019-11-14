import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as fs from "fs";

async function main() {
  try {
    // `who-to-greet` input defined in action metadata file
    console.log("🥚 Installing cage...");
    const version = core.getInput("cage-version");
    const prefix = core.getInput("cage-prefix");
    const url = `https://s3-us-west-2.amazonaws.com/loilo-public/oss/canarycage/${version}/canarycage_linux_amd64.zip`;
    const dir = fs.mkdtempSync("cage");
    process.chdir(dir);
    const file = await tc.downloadTool(url);
    const cageDest = `${prefix}/cage`;
    await tc.extractZip(file, cageDest);
    console.log(
      `🐣 cage has been installed at '${cageDest}'. Ensure it included in your $PATH`
    );
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
