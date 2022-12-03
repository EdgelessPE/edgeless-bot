import fs from "fs";
import { config } from "./config";

const shell = require("shelljs");
const DIR_WORKSHOP = config.DIR_WORKSHOP;

function clearWorkshop(): boolean {
  shell.rm("-f", "actions_failed");
  shell.rm("-rf", DIR_WORKSHOP);
  if (fs.existsSync(DIR_WORKSHOP)) {
    return false;
  }
  shell.mkdir(DIR_WORKSHOP);
  return fs.existsSync(DIR_WORKSHOP);
}

export { clearWorkshop };
