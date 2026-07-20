import cp from "child_process";
import fs from "fs";
import { where } from "./platform";
import path from "path";
import { log } from "./utils";

import shell from "shelljs";

function getCompressArguments(
  outputPath: string,
  compressLevel: number,
  entries: string[],
): string[] {
  return ["a", `-mx${compressLevel}`, outputPath, "--", ...entries];
}

async function release(
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
      cp.execFileSync(p7zip, ["x", file, `-o${intoDir}`, "-y"], { cwd });
    } catch (e) {
      log(`Error:Release command failed\n${e}`);
      resolve(false);
      return;
    }
    resolve(fs.existsSync(aID));
  });
}

async function compress(
  choosePlainDir: string,
  file: string,
  compressLevel: number,
  cwd?: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const p7zip = where("p7zip").unwrap();
    const archiveCwd = path.join(cwd ?? "", choosePlainDir);
    const outputPath = path.resolve(cwd ?? "", file);
    if (cwd) {
      shell.mkdir("-p", cwd);
    }
    shell.rm("-f", outputPath);
    try {
      const entries = fs.readdirSync(archiveCwd);
      cp.execFileSync(
        p7zip,
        getCompressArguments(outputPath, compressLevel, entries),
        { cwd: archiveCwd },
      );
    } catch (e) {
      log(`Error:Compress command failed\n${e}`);
      resolve(false);
      return;
    }
    resolve(fs.existsSync(outputPath));
  });
}

export { release, compress, getCompressArguments };
