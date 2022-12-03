import { ProducerParameters, ProducerReturned } from "../../src/class";
import { Ok, Result } from "ts-results";
import { writeGBK } from "../../src/utils";
import path from "path";
import { release } from "../../src/p7zip";

import shell from "shelljs";

export default async function (
  p: ProducerParameters
): Promise<Result<ProducerReturned, string>> {
  const { taskName, downloadedFile, workshop } = p;

  const readyDir = path.join(workshop, "_ready", taskName);
  shell.mkdir("-p", readyDir);
  release(path.join(workshop, downloadedFile), path.join(workshop, taskName));
  shell.mv(
    path.join(
      workshop,
      taskName,
      downloadedFile.replace(".zip", ""),
      "smap.exe"
    ),
    readyDir
  );
  writeGBK(
    path.join(workshop, "_ready", taskName + ".cmd"),
    `exec !setx Path "%PATH%;X:\\Program Files\\Edgeless\\${taskName}"`
  );
  //Return ready directory
  return new Ok({
    readyRelativePath: "_ready",
  });
}
