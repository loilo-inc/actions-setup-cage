import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";

export async function downloadCage({ version }: { version: string }) {
  console.log("🥚 Installing cage...");
  const url = `https://github.com/loilo-inc/canarycage/releases/download/${version}/canarycage_linux_amd64.zip`
  const zip = await tc.downloadTool(url);
  const extracted = await tc.extractZip(zip);
  const installed = await tc.cacheDir(extracted, "cage", version);
  core.addPath(installed);
  console.log(`🐣 cage has been installed at '${installed}/cage'`);
}

async function main() {
  try {
    const version = core.getInput("cage-version");
    await downloadCage({ version });
  } catch (error) {
    core.setFailed(error.message);
  }
}

if (require.main === module) {
  main();
}
