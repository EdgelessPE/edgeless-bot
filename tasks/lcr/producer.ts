import { ProducerParameters, ProducerReturned } from "../../src/class";
import { Err, Ok, Result } from "ts-results";
import { writeGBK } from "../../src/utils";
import fs from "fs";
import path from "path";

import shell from "shelljs";

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  const { downloadedFile, taskName, workshop } = p;
  const sourceFile = path.join(workshop, downloadedFile);
  const readyRoot = path.join(workshop, "_ready");
  const readyDir = path.join(readyRoot, taskName);

  if (!fs.existsSync(sourceFile)) {
    return new Err(`Error:Can't find downloaded file ${sourceFile}`);
  }

  // 将单文件程序放入插件目录，并在安装完成后隐藏启动监听服务
  shell.mkdir("-p", readyDir);
  fs.copyFileSync(sourceFile, path.join(readyDir, "lcr.exe"));
  writeGBK(
    path.join(readyRoot, `${taskName}.wcs`),
    `EXEC @!"%ProgramFiles%\\Edgeless\\${taskName}\\lcr.exe"`,
  );

  const manifest = [
    path.join(readyRoot, `${taskName}.wcs`),
    path.join(readyDir, "lcr.exe"),
  ];
  for (const item of manifest) {
    if (!fs.existsSync(item)) {
      return new Err(`Error:Self check failed: missing ${item}`);
    }
  }

  return new Ok({
    readyRelativePath: "_ready",
  });
}
