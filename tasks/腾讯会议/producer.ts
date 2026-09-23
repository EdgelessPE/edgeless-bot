import { ProducerParameters, ProducerReturned } from "../../src/class";
import { Err, Ok, Result } from "ts-results";
import { release } from "../../src/p7zip";
import { writeGBK } from "../../src/utils";
import fs from "fs";
import path from "path";

function findPayloadDirectory(extractedDir: string): string | undefined {
  return fs
    .readdirSync(extractedDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\$_\d+_$/.test(entry.name))
    .map((entry) => path.join(extractedDir, entry.name))
    .find(
      (directory) =>
        fs.existsSync(path.join(directory, "wemeet.dll")) &&
        fs.existsSync(path.join(directory, "WeMeetUninstall.exe")),
    );
}

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  const { taskName, downloadedFile, workshop, version } = p;
  const installer = path.join(workshop, downloadedFile);
  const extractedDir = path.join(workshop, "extracted");
  const readyRoot = path.join(workshop, "_ready");
  const readyDir = path.join(readyRoot, taskName);

  if (!(await release(installer, extractedDir, true))) {
    return new Err("Error:Can't extract Tencent Meeting installer");
  }

  const launcher = path.join(extractedDir, "WeMeetApp.exe");
  const updatedLauncher = path.join(extractedDir, "WeMeetApp_new.exe");
  const payloadDir = findPayloadDirectory(extractedDir);
  if (
    !fs.existsSync(launcher) ||
    !fs.existsSync(updatedLauncher) ||
    !payloadDir
  ) {
    return new Err(
      "Error:Can't find Tencent Meeting launchers or payload directory",
    );
  }

  fs.mkdirSync(readyDir, { recursive: true });
  fs.renameSync(launcher, path.join(readyDir, "WeMeetApp.exe"));
  fs.renameSync(updatedLauncher, path.join(readyDir, "WeMeetApp_new.exe"));
  fs.renameSync(payloadDir, path.join(readyDir, version));
  const shortcut = path.win32.join(
    "X:",
    "Users",
    "Default",
    "Desktop",
    taskName,
  );
  const executable = path.win32.join(
    "%ProgramFiles%",
    "Edgeless",
    taskName,
    "WeMeetApp.exe",
  );
  writeGBK(
    path.join(readyRoot, `${taskName}.wcs`),
    `LINK ${shortcut},${executable}`,
  );

  return new Ok({ readyRelativePath: "_ready" });
}
