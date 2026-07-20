import cp from "child_process";
import path from "path";
import { PROJECT_ROOT } from "./const";
import { Commands, where } from "./platform";

function getPEVersionCommand(file: string): {
  command: Commands;
  args: string[];
} {
  return {
    command: "python3",
    args: [path.resolve(PROJECT_ROOT, "scripts/read_pe_version.py"), file],
  };
}

async function readPEVersion(file: string): Promise<string> {
  const commandSpec = getPEVersionCommand(file);
  return new Promise((resolve, reject) => {
    cp.execFile(
      where(commandSpec.command).unwrap(),
      commandSpec.args,
      { encoding: "utf8" },
      (error, stdout, stderr) => {
        if (error) {
          reject(stderr.trim() || error.message);
          return;
        }
        const version = stdout.trim();
        if (!/^\d+(?:\.\d+){3}$/.test(version)) {
          reject(`Invalid PE file version: ${version}`);
          return;
        }
        resolve(version);
      },
    );
  });
}

export { getPEVersionCommand, readPEVersion };
