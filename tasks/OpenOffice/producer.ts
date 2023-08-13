import { ProducerParameters, ProducerReturned } from "../../src/types/class";
import { Err, Ok, Result } from "ts-results";
import { log } from "../../src/utils";
import path from "path";
import { release } from "../../src/p7zip";

import shell from "shelljs";
import fs from "fs";
import { NepWorkflow } from "../../src/types/nep";
import TOML from "@iarna/toml";

export default async function (
  p: ProducerParameters
): Promise<Result<ProducerReturned, string>> {
  const { taskName, downloadedFile, workshop } = p;

  const readyDir = path.join(workshop, "_ready", taskName);
  shell.mkdir("-p", path.join(workshop, "_ready"));
  log(`Info: ${downloadedFile}`);
  const res = await release(path.join(workshop, downloadedFile), readyDir);
  if (!res) return new Err("Error:Can't release downloaded file");
  shell.mv(path.join(workshop, downloadedFile.split(".")[0]), readyDir);
  shell.rm("-rf", path.join(readyDir, "$PLUGINSDIR"));
  shell.rm("-rf", path.join(readyDir, "Other"));

  const wfp = path.join(workshop, "_ready", "workflows");
  shell.mkdir("-p", wfp);
  const setup: NepWorkflow = {
    link: {
      name: "Link Office",
      step: "Link",
      source_file: "OpenOfficePortable.exe",
      target_name: "OpenOffice",
    },
  };
  fs.writeFileSync(path.join(wfp, "setup.toml"), TOML.stringify(setup as any));
  // fs.writeFileSync(
  //   path.join(workshop, "_ready", taskName + ".wcs"),
  //   "FILE X:\\Program Files\\Edgeless\\OpenOffice->X:\\Users\\PortableApps\\OpenOffice\n" +
  //     "LINK X:\\Users\\Default\\Desktop\\OpenOfficeBase,X:\\Users\\PortableApps\\OpenOffice\\OpenOfficeBasePortable.exe\n" +
  //     "LINK X:\\Users\\Default\\Desktop\\OpenOfficeCalc,X:\\Users\\PortableApps\\OpenOffice\\OpenOfficeCalcPortable.exe\n" +
  //     "LINK X:\\Users\\Default\\Desktop\\OpenOfficeDraw,X:\\Users\\PortableApps\\OpenOffice\\OpenOfficeDrawPortable.exe\n" +
  //     "LINK X:\\Users\\Default\\Desktop\\OpenOfficeImpress,X:\\Users\\PortableApps\\OpenOffice\\OpenOfficeImpressPortable.exe\n" +
  //     "LINK X:\\Users\\Default\\Desktop\\OpenOfficeMath,X:\\Users\\PortableApps\\OpenOffice\\OpenOfficeMathPortable.exe\n" +
  //     "LINK X:\\Users\\Default\\Desktop\\OpenOffice,X:\\Users\\PortableApps\\OpenOffice\\OpenOfficePortable.exe\n" +
  //     "LINK X:\\Users\\Default\\Desktop\\OpenOfficeWriter,X:\\Users\\PortableApps\\OpenOffice\\OpenOfficeWriterPortable.exe"
  // );
  //Return ready directory
  return new Ok({
    readyRelativePath: "_ready",
    mainProgram:"OpenOfficePortable.exe"
  });
}
