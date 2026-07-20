import cp from "child_process";
import { Commands, where } from "./platform";

function getPEVersionCommand(file: string): {
  command: Commands;
  args: string[];
} {
  return {
    command: "peres",
    args: ["-v", file],
  };
}

function parsePEVersionOutput(output: string): string {
  const fileVersionLine = output
    .split(/\r?\n/)
    .find((line) => /^File Version:/i.test(line.trim()));
  const version = fileVersionLine?.match(/\d+(?:\.\d+){1,3}/)?.[0];
  if (!version) {
    throw new Error(`Invalid peres file version output: ${output.trim()}`);
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
