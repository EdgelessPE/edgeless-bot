import fs from "fs";
import path from "path";
import { ProducerParameters, ProducerReturned } from "@/types/class";
import { Err, Ok, Result } from "ts-results";

import { NepWorkflow } from "@/types/nep";
import { tomlStringify } from "@/utils";
import shell from "shelljs";

interface RequiredObject {
  shortcutName: string;
}

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  const { workshop, downloadedFile, requiredObject, taskName } = p;
  const { shortcutName } = requiredObject as RequiredObject;
  const ready = path.join(workshop, "ready");
  const aDF = path.join(workshop, downloadedFile),
    rD = `${workshop}/ready/${taskName}`;

  shell.mkdir("-p", rD);
  shell.mv(aDF, rD);
  // fs.writeFileSync(
  //   path.join(ready, taskName + ".wcs"),
  //   `LINK X:\\Users\\Default\\Desktop\\${shortcutName},%ProgramFiles%\\Edgeless\\${taskName}\\${downloadedFile}`
  // );
  const wfp = path.join(ready, "workflows");
  shell.mkdir("-p", wfp);
  const setup: NepWorkflow = {
    link: {
      name: "Create Shortcut",
      step: "Link",
      source_file: downloadedFile,
      target_name: shortcutName,
    },
  };
  fs.writeFileSync(path.join(wfp, "setup.toml"), tomlStringify(setup));

  const exist = function (p: string): boolean {
    return fs.existsSync(path.join(ready, p));
  };
  if (
    exist(path.join("workflows", "setup.toml")) &&
    exist(`${taskName}/${downloadedFile}`)
  ) {
    return new Ok({
      readyRelativePath: "ready",
      mainProgram: downloadedFile,
      expandableContext: {
        downloadedFilePath: path.join(taskName, downloadedFile),
      },
    });
  } else {
    return new Err(
      "Error:Click2install self check failed due to file missing in ready folder",
    );
  }
}
