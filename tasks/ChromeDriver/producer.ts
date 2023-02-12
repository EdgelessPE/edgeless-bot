import { ProducerParameters, ProducerReturned } from "../../src/types/class";
import { Err, Ok, Result } from "ts-results";
import { log, writeGBK } from "../../src/utils";
import path from "path";
import { release } from "../../src/p7zip";

import shell from "shelljs";

export default async function (
  p: ProducerParameters
): Promise<Result<ProducerReturned, string>> {
  const { taskName, downloadedFile, workshop } = p;

  const readyDir = path.join(workshop, "_ready", taskName);
  shell.mkdir("-p", readyDir);
  log(`Info: ${downloadedFile}`);
  const res = await release(
    path.join(workshop, downloadedFile),
    path.join(workshop, "_ready", taskName)
  );
  if (!res) return new Err("Error:Can't release downloaded file");
  writeGBK(
    path.join(workshop, "_ready", taskName + ".cmd"),
    `setx Path "%PATH%;X:\\Program Files\\Edgeless\\${taskName}"`
  );
  //Return ready directory
  return new Ok({
    readyRelativePath: "_ready",
    mainProgram:"chromedriver.exe"
  });
}
