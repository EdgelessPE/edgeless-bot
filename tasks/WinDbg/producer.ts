import { ProducerParameters, ProducerReturned } from "../../src/class";
import { Err, Ok, Result } from "ts-results";
import { writeGBK } from "../../src/utils";
import childProcess from "child_process";
import fs from "fs";
import path from "path";

function extractMsi(
  installerPath: string,
  targetDir: string,
  cwd: string,
): Promise<Result<void, string>> {
  return new Promise((resolve) => {
    childProcess.execFile(
      "msiexec.exe",
      ["/a", installerPath, "/qn", `TARGETDIR=${targetDir}`, "/norestart"],
      { cwd },
      (error) => {
        if (error) {
          resolve(new Err(`Error:Can't extract WinDbg MSI: ${error.message}`));
        } else {
          resolve(new Ok(undefined));
        }
      },
    );
  });
}

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  const extractDir = path.join(p.workshop, "_windbg_extract"),
    sourceDir = path.join(extractDir, "Windows Kits", "10", "Debuggers", "x64"),
    readyRoot = path.join(p.workshop, "_ready"),
    readyDir = path.join(readyRoot, p.taskName);

  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });
  const extractRes = await extractMsi(
    path.join(p.workshop, p.downloadedFile),
    extractDir,
    p.workshop,
  );
  if (extractRes.err) return extractRes;
  if (!fs.existsSync(path.join(sourceDir, "windbg.exe"))) {
    return new Err("Error:WinDbg x64 files not found after MSI extraction");
  }

  fs.mkdirSync(readyRoot, { recursive: true });
  fs.cpSync(sourceDir, readyDir, { recursive: true });
  fs.rmSync(extractDir, { recursive: true, force: true });
  writeGBK(
    path.join(readyRoot, `${p.taskName}.wcs`),
    `// Auto produced by Edgeless Bot - WinDbg
// taskName: ${p.taskName}
// version: ${p.version}
// category: ${p.category}
// author: ${p.author}

LINK X:\\Users\\Default\\Desktop\\WinDbg,%ProgramFiles%\\Edgeless\\${p.taskName}\\windbg.exe
`,
  );

  if (
    !fs.existsSync(path.join(readyRoot, `${p.taskName}.wcs`)) ||
    !fs.existsSync(path.join(readyDir, "windbg.exe")) ||
    !fs.existsSync(path.join(readyDir, "cdb.exe")) ||
    !fs.existsSync(path.join(readyDir, "dbgeng.dll"))
  ) {
    return new Err("Error:WinDbg producer self check failed");
  }
  return new Ok({ readyRelativePath: "_ready" });
}
