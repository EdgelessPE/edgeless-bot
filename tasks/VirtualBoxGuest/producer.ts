import fs from "fs";
import path from "path";
import { Err, Ok, Result } from "ts-results";
import { ProducerParameters, ProducerReturned } from "../../src/class";
import { release } from "../../src/p7zip";
import { writeGBK } from "../../src/utils";

const WINDOWS_ADDITIONS = "VBoxWindowsAdditions-amd64.exe";
const DRIVER_FILES = [
  "VBoxControl.exe",
  "VBoxGuest.cat",
  "VBoxGuest.inf",
  "VBoxGuest.sys",
  "VBoxTray.exe",
];

function copyDriverFiles(
  source: string,
  destination: string,
): Result<void, string> {
  for (const fileName of DRIVER_FILES) {
    const sourceFile = path.join(source, fileName);
    if (!fs.existsSync(sourceFile)) {
      return new Err(`Error:Can't find VirtualBox Guest file ${sourceFile}`);
    }
  }

  fs.mkdirSync(destination, { recursive: true });
  for (const fileName of DRIVER_FILES) {
    fs.copyFileSync(
      path.join(source, fileName),
      path.join(destination, fileName),
    );
  }
  return new Ok(undefined);
}

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  const isoDirectory = path.join(p.workshop, "_iso");
  const additionsDirectory = path.join(p.workshop, "_windows_additions");
  const readyRoot = path.join(p.workshop, "_ready");
  const readyDirectory = path.join(readyRoot, p.taskName);

  const isoReleased = await release(
    p.downloadedFile,
    isoDirectory,
    true,
    p.workshop,
  );
  if (!isoReleased) {
    return new Err(`Error:Can't release downloaded file ${p.downloadedFile}`);
  }

  const additionsInstaller = path.join(isoDirectory, WINDOWS_ADDITIONS);
  if (!fs.existsSync(additionsInstaller)) {
    return new Err(
      `Error:Can't find ${WINDOWS_ADDITIONS} in Guest Additions ISO`,
    );
  }

  const additionsReleased = await release(
    additionsInstaller,
    additionsDirectory,
    true,
    p.workshop,
  );
  if (!additionsReleased) {
    return new Err(`Error:Can't release ${WINDOWS_ADDITIONS}`);
  }

  fs.rmSync(readyRoot, { recursive: true, force: true });
  const copied = copyDriverFiles(
    path.join(additionsDirectory, "VBoxGuest"),
    readyDirectory,
  );
  if (copied.err) {
    return copied;
  }

  writeGBK(
    path.join(readyRoot, `${p.taskName}.wcs`),
    `EXEC =!drvload.exe "%ProgramFiles%\\Edgeless\\${p.taskName}\\VBoxGuest.inf"\n` +
      `EXEC !"%ProgramFiles%\\Edgeless\\${p.taskName}\\VBoxTray.exe"`,
  );

  return new Ok({
    readyRelativePath: "_ready",
  });
}
