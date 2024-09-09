import cp from "child_process";
import fs from "fs";
import { where } from "./platform";
import path from "path";
import { log } from "./utils";

import shell from "shelljs";

export async function release(
  file: string,
  intoDir: string,
  overwrite?: boolean,
  cwd?: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const p7zip = where("p7zip").unwrap();
    const aID = path.join(cwd ?? "", intoDir);
    if (overwrite && fs.existsSync(aID)) {
      if (fs.existsSync(aID)) {
        shell.rm("-rf", aID);
      }
      shell.mkdir("-p", aID);
    }
    try {
      cp.execSync(`${p7zip} x "${file}" -o"${intoDir}" -y`, { cwd });
    } catch (e) {
      log("Error:Release command failed\n" + e);
      resolve(false);
      return;
    }
    resolve(fs.existsSync(aID));
  });
}

export async function compress(
  choosePlainDir: string,
  file: string,
  compressLevel: number,
  cwd?: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const p7zip = where("p7zip").unwrap();
    if (cwd) {
      shell.mkdir("-p", cwd);
    }
    shell.rm("-f", path.join(cwd ?? "", file));
    try {
      cp.execSync(`${p7zip} a -mx${compressLevel} ../"${file}" *`, {
        cwd: path.join(cwd ?? "", choosePlainDir),
      });
    } catch (e) {
      log("Error:Compress command failed\n" + e);
      resolve(false);
      return;
    }
    resolve(fs.existsSync(path.join(cwd ?? "", file)));
  });
}
