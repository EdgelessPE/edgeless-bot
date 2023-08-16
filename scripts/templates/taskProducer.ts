import { ProducerParameters, ProducerReturned } from "../../src/types/class";
import { Err, Ok, Result } from "ts-results";
import path from "path";
import fs from "fs";

import shell from "shelljs";
import { NepWorkflow } from "../../src/types/nep";
import { tomlStringify } from "../../src/utils";

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  const { taskName, downloadedFile, workshop, version } = p;

  //Create ready directory
  const readyDir = path.join(workshop, "_ready", taskName);
  shell.mkdir("-p", readyDir);

  //YOUR CODE HERE

  //Create setup flow
  const wfp = path.join(workshop, "_ready", "workflows");
  shell.mkdir("-p", wfp);
  const setup: NepWorkflow = {
    link: {
      name: "Create Shortcut",
      step: "Link",
      source_file: `${taskName}.exe`,
      target_name: taskName,
    },
  };
  fs.writeFileSync(path.join(wfp, "setup.toml"), tomlStringify(setup));

  //Naive self check
  const manifest = [`workflows/setup.toml`, `${taskName}/${taskName}.exe`].map(
    (file) => path.join(workshop, "_ready", file),
  );
  for (const item of manifest) {
    if (!fs.existsSync(item)) {
      return new Err(
        `Error:Self check failed : missing ${item} in ready directory`,
      );
    }
  }

  //Return ready directory
  return new Ok({
    readyRelativePath: "_ready",
  });
}
