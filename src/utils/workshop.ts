import fs from "fs";
import { config } from "../config";

import shell from "shelljs";

const DIR_WORKSHOP = config.DIR_WORKSHOP;

export function clearWorkshop(): boolean {
  shell.rm("-f", "actions_failed");
  shell.rm("-rf", DIR_WORKSHOP);
  if (fs.existsSync(DIR_WORKSHOP)) {
    return false;
  }
  shell.mkdir(DIR_WORKSHOP);
  return fs.existsSync(DIR_WORKSHOP);
}
