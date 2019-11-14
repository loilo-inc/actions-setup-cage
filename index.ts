import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as fs from "fs";
import * as download from "download";

export async function downloadCage({version, prefix}: {version: string, prefix: string}) {
  console.log("🥚 Installing cage...");
  const url = `https://s3-us-west-2.amazonaws.com/loilo-public/oss/canarycage/${version}/canarycage_linux_amd64.zip`;
  const dir = fs.mkdtempSync("cage_");
  await download(url, dir);
  const cageDest = `${prefix}/cage`;
  const cwd = process.cwd();
  process.chdir(dir);
  await tc.extractZip(`canarycage_linux_amd64.zip`, ".");
  process.chdir(cwd);
  await fs.promises.rename(`${dir}/cage`, cageDest);
  console.log(
    `🐣 cage has been installed at '${cageDest}'. Ensure it included in your $PATH`
  );
}

async function main() {
  try {
    const version = core.getInput("cage-version");
    const prefix = core.getInput("cage-prefix");
    await downloadCage({version, prefix});
  } catch (error) {
    core.setFailed(error.message);
  }
}

if (require.main === module) {
  main();
}
