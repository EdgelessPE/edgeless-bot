import cp from "child_process";
import fs from "fs";
import { where } from "./platform";
import path from "path";
import { log } from "./utils";

import shell from "shelljs";

async function releaseInno(
  file: string,
  intoDir: string,
  overwrite?: boolean,
  cwd?: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const innounp = where("innounp").unwrap();
    const aID = path.join(cwd ?? "", intoDir);
    if (overwrite && fs.existsSync(aID)) {
      if (fs.existsSync(aID)) {
        shell.rm("-rf", aID);
      }
      shell.mkdir("-p", aID);
    }
    try {
      cp.execSync(`${innounp} -x -d"${intoDir}" "${file}" -y`, { cwd });
    } catch (e) {
      log(`Error:ReleaseInno command failed\n${e}`);
      resolve(false);
      return;
    }
    resolve(fs.existsSync(aID));
  });
}

export { releaseInno };
