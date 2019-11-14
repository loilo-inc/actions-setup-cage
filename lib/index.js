"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const tc = require("@actions/tool-cache");
const fs = require("fs");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // `who-to-greet` input defined in action metadata file
            console.log("🥚 Installing cage...");
            const version = core.getInput("cage-version");
            const prefix = core.getInput("cage-prefix");
            const url = `https://s3-us-west-2.amazonaws.com/loilo-public/oss/canarycage/${version}/canarycage_linux_amd64.zip`;
            const dir = fs.mkdtempSync("cage");
            process.chdir(dir);
            const file = yield tc.downloadTool(url);
            const cageDest = `${prefix}/cage`;
            yield tc.extractZip(file, cageDest);
            console.log(`🐣 cage has been installed at '${cageDest}'. Ensure it included in your $PATH`);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
main();
