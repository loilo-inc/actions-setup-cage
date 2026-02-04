import * as core from "@actions/core";
import * as io from "@actions/io";
import { run } from "./runner";

if (process.env["GITHUB_ACTIONS"] === "true") {
  run({ core, io }).catch((error) => {
    core.setFailed(error instanceof Error ? error.message : String(error));
  });
}
