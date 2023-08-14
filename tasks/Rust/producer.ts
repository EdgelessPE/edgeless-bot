import { ProducerParameters, ProducerReturned } from "../../src/class";
import { Ok, Result } from "ts-results";
import { writeGBK } from "../../src/utils";
import path from "path";

import shell from "shelljs";

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  const { taskName, downloadedFile, workshop } = p;

  const readyDir = path.join(workshop, "_ready", taskName);
  shell.mkdir("-p", readyDir);
  shell.mv(path.join(workshop, downloadedFile), readyDir);
  writeGBK(
    path.join(workshop, "_ready", taskName + ".cmd"),
    `"X:\\Program Files\\Edgeless\\${taskName}\\${downloadedFile}" /qb`,
  );
  //Return ready directory
  return new Ok({
    readyRelativePath: "_ready",
  });
}
