import { ProducerParameters, ProducerReturned } from "../../src/types/class";
import { Err, Ok, Result } from "ts-results";
import path from "path";
import { release } from "../../src/p7zip";

import shell from "shelljs";
import fs from "fs";
import {NepWorkflow} from "../../src/types/nep";
import TOML from "@iarna/toml";

export default async function (
  p: ProducerParameters
): Promise<Result<ProducerReturned, string>> {
  const { taskName, downloadedFile, workshop } = p;

  const readyDir = path.join(workshop, "_ready", taskName);
  shell.mkdir("-p", readyDir);
  const res = await release(
    path.join(workshop, downloadedFile),
    path.join(workshop, taskName)
  );
  if (!res) return new Err("Error:Can't release downloaded file");
  shell.mv(
    path.join(
      workshop,
      taskName,
      downloadedFile.replace(".zip", ""),
      "smap.exe"
    ),
    readyDir
  );
  const wfp=path.join(workshop, "_ready","workflows")
  shell.mkdir("-p",wfp)
  const setup:NepWorkflow={
    path:{
      name:"Set Path",
      step:"Path",
      record:"smap.exe"
    }
  }
  fs.writeFileSync(path.join(wfp,"setup.toml"),TOML.stringify(setup as any))

  // fs.writeFileSync(
  //   path.join(workshop, "_ready", taskName + ".cmd"),
  //   `exec !setx Path "%PATH%;X:\\Program Files\\Edgeless\\${taskName}"`
  // );
  //Return ready directory
  return new Ok({
    readyRelativePath: "_ready",
    mainProgram:"smap.exe"
  });
}
