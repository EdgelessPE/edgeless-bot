import path from "path";
import { release } from "@/cli/p7zip";
import { ProducerParameters, ProducerReturned } from "@/types/class";
import { Err, Ok, Result } from "ts-results";

import fs from "fs";
import { NepWorkflow } from "@/types/nep";
import { tomlStringify } from "@/utils";
import shell from "shelljs";

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  const { taskName, downloadedFile, workshop } = p;

  const readyDir = path.join(workshop, "_ready", taskName);
  shell.mkdir("-p", readyDir);
  const res = await release(
    path.join(workshop, downloadedFile),
    path.join(workshop, taskName),
  );
  if (!res) return new Err("Error:Can't release downloaded file");
  shell.mv(
    path.join(
      workshop,
      taskName,
      downloadedFile.replace(".zip", ""),
      "smap.exe",
    ),
    readyDir,
  );
  const wfp = path.join(workshop, "_ready", "workflows");
  shell.mkdir("-p", wfp);
  const setup: NepWorkflow = {
    path: {
      name: "Set Path",
      step: "Path",
      record: "smap.exe",
    },
  };
  fs.writeFileSync(path.join(wfp, "setup.toml"), tomlStringify(setup));

  // Return ready directory
  return new Ok({
    readyRelativePath: "_ready",
    revisedVersion: "smap.exe",
  });
}
