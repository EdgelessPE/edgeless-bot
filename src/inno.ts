import cp from "child_process";
import fs from "fs";
import { Commands, getOS, OS, where } from "./platform";
import path from "path";
import { log } from "./utils";

import shell from "shelljs";

function getInnoCommand(
  os: OS,
  file: string,
  intoDir: string,
): { command: Commands; args: string[] } {
  if (os == "Windows") {
    return {
      command: "innounp",
      args: ["-x", `-d${intoDir}`, file, "-y"],
    };
  }
  return {
    command: "innoextract",
    args: ["--extract", "--output-dir", intoDir, file],
  };
}

async function releaseInno(
  file: string,
  intoDir: string,
  overwrite?: boolean,
  cwd?: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const commandSpec = getInnoCommand(getOS(), file, intoDir);
    const executable = where(commandSpec.command).unwrap();
    const aID = path.join(cwd ?? "", intoDir);
    if (overwrite && fs.existsSync(aID)) {
      if (fs.existsSync(aID)) {
        shell.rm("-rf", aID);
      }
      shell.mkdir("-p", aID);
    }
    try {
      cp.execFileSync(executable, commandSpec.args, { cwd });
    } catch (e) {
      log(`Error:ReleaseInno command failed\n${e}`);
      resolve(false);
      return;
    }
    resolve(fs.existsSync(aID));
  });
}

export { getInnoCommand, releaseInno };
