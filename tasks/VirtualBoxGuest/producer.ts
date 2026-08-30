import cp from "child_process";
import fs from "fs";
import path from "path";
import { Err, Ok, Result } from "ts-results";
import { ProducerParameters, ProducerReturned } from "../../src/class";
import { release } from "../../src/p7zip";
import { where } from "../../src/platform";
import { writeGBK } from "../../src/utils";

const WINDOWS_ADDITIONS = "VBoxWindowsAdditions-amd64.exe";
const SIGNED_CATALOG_PATH = "VBoxGuest\\vboxguest.cat";
const DRIVER_FILES = [
  "VBoxControl.exe",
  "VBoxGuest.inf",
  "VBoxGuest.sys",
  "VBoxHook.dll",
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

function extractSignedCatalog(
  installer: string,
  destination: string,
  cwd: string,
): Result<string, string> {
  const p7zip = where("p7zip");
  if (p7zip.err) {
    return new Err(p7zip.val);
  }

  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  try {
    cp.execFileSync(
      p7zip.val,
      ["e", installer, `-o${destination}`, "-ssc", "-y", SIGNED_CATALOG_PATH],
      { cwd, stdio: "ignore" },
    );
  } catch (e) {
    return new Err(
      `Error:Can't extract signed VirtualBox Guest catalog: ${String(e)}`,
    );
  }

  const catalog = path.join(destination, "vboxguest.cat");
  if (!fs.existsSync(catalog)) {
    return new Err(`Error:Can't find signed VirtualBox Guest catalog`);
  }
  return new Ok(catalog);
}

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  const isoDirectory = path.join(p.workshop, "_iso");
  const additionsDirectory = path.join(p.workshop, "_windows_additions");
  const catalogDirectory = path.join(p.workshop, "_windows_catalog");
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

  const catalog = extractSignedCatalog(
    additionsInstaller,
    catalogDirectory,
    p.workshop,
  );
  if (catalog.err) {
    return catalog;
  }

  fs.rmSync(readyRoot, { recursive: true, force: true });
  const copied = copyDriverFiles(
    path.join(additionsDirectory, "VBoxGuest"),
    readyDirectory,
  );
  if (copied.err) {
    return copied;
  }
  fs.copyFileSync(catalog.val, path.join(readyDirectory, "VBoxGuest.cat"));

  writeGBK(
    path.join(readyRoot, `${p.taskName}.cmd`),
    `@echo off\r\n` +
      `cd /d "%~dp0${p.taskName}"\r\n` +
      `sc query VBoxGuest | find "RUNNING" >nul 2>&1\r\n` +
      `if errorlevel 1 drvload.exe "VBoxGuest.inf"\r\n` +
      `if errorlevel 1 exit /b %errorlevel%\r\n` +
      `ping.exe 127.0.0.1 -n 11 >nul\r\n` +
      `explorer.exe "%CD%\\VBoxTray.exe"\r\n` +
      `exit\r\n`,
  );

  return new Ok({
    readyRelativePath: "_ready",
  });
}
