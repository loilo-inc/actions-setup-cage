import {downloadCage} from "./index";

describe("main",() => {
  test("" ,async () => {
    await downloadCage({version: "3.1.1"});
  }, 10*1000);
});