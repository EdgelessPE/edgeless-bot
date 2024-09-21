import { where } from "../utils/platform";
import path from "path";
import cp from "child_process";
import { log } from "../utils";
import fs from "fs";

export async function packIntoNep(
  sourceDir: string,
  intoFile: string,
): Promise<boolean> {
  log(`Info:Packing '${sourceDir}' into '${intoFile}'`);
  return new Promise((resolve) => {
    const ept = where("ept").unwrap();
    cp.exec(
      `${ept} pack "${sourceDir}" "${intoFile}"`,
      {
        cwd: path.join(process.cwd(), "bin", "ept"),
      },
      (_, stdout, stderr) => {
        if (fs.existsSync(intoFile)) {
          resolve(true);
        } else {
          log(
            "Error:Pack command failed with output:\n" + stdout + "\n" + stderr,
          );
          resolve(false);
        }
      },
    );
  });
}

export async function genMeta(
  sourceDir: string,
  intoFile: string,
): Promise<boolean> {
  log(`Info:Generating meta for '${sourceDir}' into '${intoFile}'`);
  return new Promise((resolve) => {
    const ept = where("ept").unwrap();
    cp.exec(
      `${ept} --offline meta "${sourceDir}" "${intoFile}"`,
      {
        cwd: path.join(process.cwd(), "bin", "ept"),
      },
      (_, stdout, stderr) => {
        if (fs.existsSync(intoFile)) {
          resolve(true);
        } else {
          log(
            "Error:Meta command failed with output:\n" + stdout + "\n" + stderr,
          );
          resolve(false);
        }
      },
    );
  });
}
