import { where } from "./platform";
import path from "path";
import cp from "child_process";
import { log } from "./utils";
import fs from "fs";

async function packIntoNep(
  sourceDir: string,
  intoFile: string,
): Promise<boolean> {
  log(`Info:Packing ${sourceDir} into ${intoFile}`);
  return new Promise((resolve) => {
    const ept = where("ept").unwrap();
    cp.exec(
      `${ept} pack "${sourceDir}" "${intoFile}"`,
      {
        cwd: path.join(process.cwd(), "bin", "ept"),
      },
      (err, stdout, stderr) => {
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

export { packIntoNep };
