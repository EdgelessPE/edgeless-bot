import { ProducerParameters, ProducerReturned } from "../../src/class";
import { Err, Ok, Result } from "ts-results";
import { release } from "../../src/p7zip";
import { writeGBK } from "../../src/utils";
import fs from "fs";
import path from "path";

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

  // 解压 Windows 构建，并在安装完成后隐藏启动监听服务
  fs.mkdirSync(readyRoot, { recursive: true });
  const released = await release(sourceFile, readyDir, true);
  if (!released) {
    return new Err(`Error:Can't release downloaded file ${sourceFile}`);
  }
  writeGBK(
    path.join(readyRoot, `${taskName}.wcs`),
    `EXEC @!"%ProgramFiles%\\Edgeless\\${taskName}\\lcr.exe" --listen 0.0.0.0:9527`,
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
