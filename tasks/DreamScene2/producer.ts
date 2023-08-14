import { ProducerParameters, ProducerReturned } from "../../src/class";
import { Err, Ok, Result } from "ts-results";
import { log, writeGBK } from "../../src/utils";
import path from "path";
import { release } from "../../src/p7zip";

import shell from "shelljs";

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  const { taskName, downloadedFile, workshop } = p;

  const readyDir = path.join(workshop, "_ready", taskName);
  shell.mkdir("-p", path.join(workshop, "_ready"));
  log(`Info: ${downloadedFile}`);
  const res = await release(path.join(workshop, downloadedFile), workshop);
  if (!res) return new Err("Error:Can't release downloaded file");
  shell.mv(path.join(workshop, downloadedFile.split(".")[0]), readyDir);
  writeGBK(
    path.join(workshop, "_ready", taskName + ".wcs"),
    `LINK %desktop%\\DreamScene2 X:\\Program Files\\Edgeless\\${taskName}\\DreamScene2.exe"`,
  );
  //Return ready directory
  return new Ok({
    readyRelativePath: "_ready",
  });
}
