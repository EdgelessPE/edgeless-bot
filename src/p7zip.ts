import cp from "child_process";
import fs from "fs";
import { where } from "./platform";
import path from "path";
import { log } from "./utils";

import shell from "shelljs";

function normalizeExtractedPaths(root: string): void {
  const resolvedRoot = path.resolve(root);
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const source = path.join(root, entry.name);
    if (entry.name.includes("\\")) {
      const segments = entry.name.split("\\");
      if (
        segments.some(
          (segment) => segment === "" || segment === "." || segment === "..",
        )
      ) {
        throw new Error(`Unsafe extracted path: ${entry.name}`);
      }
      const destination = path.resolve(resolvedRoot, ...segments);
      if (!destination.startsWith(`${resolvedRoot}${path.sep}`)) {
        throw new Error(`Extracted path escapes destination: ${entry.name}`);
      }
      let parent = resolvedRoot;
      for (const segment of segments.slice(0, -1)) {
        parent = path.join(parent, segment);
        if (fs.existsSync(parent) && fs.lstatSync(parent).isSymbolicLink()) {
          throw new Error(`Extracted path traverses symlink: ${entry.name}`);
        }
      }
      if (fs.existsSync(destination)) {
        throw new Error(`Extracted path already exists: ${destination}`);
      }
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.renameSync(source, destination);
      if (entry.isDirectory()) normalizeExtractedPaths(destination);
      continue;
    }
    if (entry.isDirectory()) normalizeExtractedPaths(source);
  }
}

function mergeExtractedDirectory(source: string, destination: string): void {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (
      entry.isDirectory() &&
      fs.existsSync(destinationPath) &&
      fs.lstatSync(destinationPath).isDirectory() &&
      !fs.lstatSync(destinationPath).isSymbolicLink()
    ) {
      mergeExtractedDirectory(sourcePath, destinationPath);
      fs.rmdirSync(sourcePath);
      continue;
    }
    fs.rmSync(destinationPath, { recursive: true, force: true });
    fs.renameSync(sourcePath, destinationPath);
  }
}

function removeTemporaryDirectory(directory: string): void {
  try {
    fs.rmSync(directory, { recursive: true, force: true });
  } catch (e) {
    log(`Warning:Can't remove temporary directory ${directory}: ${String(e)}`);
  }
}

function replaceDirectory(source: string, destination: string): void {
  const parent = path.dirname(destination);
  const backup = fs.mkdtempSync(path.join(parent, ".edgeless-backup-"));
  fs.rmdirSync(backup);
  const hadDestination = fs.existsSync(destination);
  try {
    if (hadDestination) fs.renameSync(destination, backup);
    fs.renameSync(source, destination);
  } catch (e) {
    if (
      hadDestination &&
      !fs.existsSync(destination) &&
      fs.existsSync(backup)
    ) {
      fs.renameSync(backup, destination);
    }
    throw e;
  }
  if (hadDestination) {
    try {
      fs.rmSync(backup, { recursive: true, force: true });
    } catch (e) {
      log(`Warning:Can't remove extraction backup ${backup}: ${String(e)}`);
    }
  }
}

function commitExtractedDirectory(
  source: string,
  destination: string,
  overwrite: boolean,
): void {
  if (
    fs.existsSync(destination) &&
    fs.lstatSync(destination).isSymbolicLink()
  ) {
    throw new Error(`Extraction destination is a symlink: ${destination}`);
  }
  if (overwrite || !fs.existsSync(destination)) {
    replaceDirectory(source, destination);
    return;
  }

  const assembled = fs.mkdtempSync(
    path.join(path.dirname(destination), ".edgeless-assembled-"),
  );
  try {
    fs.cpSync(destination, assembled, {
      recursive: true,
      force: true,
      verbatimSymlinks: true,
    });
    mergeExtractedDirectory(source, assembled);
    replaceDirectory(assembled, destination);
  } finally {
    removeTemporaryDirectory(assembled);
  }
}

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
  let stagingDir: string | undefined;
  try {
    const p7zip = where("p7zip").unwrap();
    const aID = path.resolve(cwd ?? process.cwd(), intoDir);
    fs.mkdirSync(path.dirname(aID), { recursive: true });
    stagingDir = fs.mkdtempSync(
      path.join(path.dirname(aID), ".edgeless-unzip-"),
    );
    cp.execFileSync(p7zip, ["x", file, `-o${stagingDir}`, "-y"], { cwd });
    normalizeExtractedPaths(stagingDir);
    commitExtractedDirectory(stagingDir, aID, overwrite ?? false);
    return fs.existsSync(aID);
  } catch (e) {
    log(`Error:Release command failed\n${String(e)}`);
    return false;
  } finally {
    if (stagingDir !== undefined) {
      removeTemporaryDirectory(stagingDir);
    }
  }
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

export {
  release,
  compress,
  commitExtractedDirectory,
  getCompressArguments,
  normalizeExtractedPaths,
};
