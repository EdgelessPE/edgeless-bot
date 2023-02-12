import { ProducerParameters, ProducerReturned } from "../../src/types/class";
import { writeGBK } from "../../src/utils";
import { Err, Ok, Result } from "ts-results";
import path from "path";
import fs from "fs";

import shell from "shelljs";

interface RequiredObject {}

export default async function (
  p: ProducerParameters
): Promise<Result<ProducerReturned, string>> {
  const { taskName, downloadedFile, workshop, version } = p;
  const obj = p.requiredObject as RequiredObject;

  //Create ready directory
  const contentDir = path.join(workshop, "_ready", taskName);
  shell.mkdir("-p", contentDir);

  //YOUR CODE HERE

  //Write command to external batch
  const cmd = `LINK X:\\Users\\Default\\Desktop\\${taskName},%ProgramFiles%\\Edgeless\\${taskName}\\${taskName}.exe`;
  writeGBK(path.join(workshop, "_ready", taskName + ".wcs"), cmd);

  //Naive self check
  const manifest = [`${taskName}.wcs`, `${taskName}/${taskName}.exe`].map(
    (file) => path.join(workshop, "_ready", file)
  );
  for (const item of manifest) {
    if (!fs.existsSync(item)) {
      return new Err(
        `Error:Self check failed : missing ${item} in ready directory`
      );
    }
  }

  //Return ready directory
  return new Ok({
    readyRelativePath: "_ready",
  });
}
