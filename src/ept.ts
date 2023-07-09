import { where } from "./platform";
import path from "path";
import cp from "child_process";
import { log } from "./utils";
import fs from "fs";

async function packIntoNep(
  sourceDir: string,
  intoFile: string
): Promise<boolean> {
  log(`Info:Packing ${sourceDir} into ${intoFile}`);
  return new Promise((resolve) => {
    const ept = where("ept").unwrap();
    let output;
    try {
      output = cp.execSync(`${ept} pack "${sourceDir}" "${intoFile}"`, {
        cwd: path.join(process.cwd(), "bin", "ept"),
      });
    } catch (e) {
      log("Error:Pack command failed\n" + e);
      resolve(false);
      return;
    }
    if (fs.existsSync(intoFile)) {
      resolve(true);
    } else {
      log("Error:Pack command failed with output:\n" + output);
      resolve(false);
    }
  });
}

export { packIntoNep };
