import cp from "child_process";
import { Commands, where } from "./platform";

function getPEVersionCommand(file: string): {
  command: Commands;
  args: string[];
} {
  return {
    command: "peversion",
    args: [file],
  };
}

function parsePEVersionOutput(output: string): string {
  const version = output.trim();
  if (!/^\d+(?:\.\d+){3}$/.test(version)) {
    throw new Error(`Invalid PE file version output: ${version}`);
  }
  return version;
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
        try {
          resolve(parsePEVersionOutput(stdout));
        } catch (parseError) {
          reject(parseError);
          return;
        }
      },
    );
  });
}

export { getPEVersionCommand, parsePEVersionOutput, readPEVersion };
