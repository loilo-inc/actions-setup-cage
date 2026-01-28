import * as core from "@actions/core";
import * as io from "@actions/io";
import { run } from "./runner";

if (require.main === module) {
  run({ core, io, console });
}
