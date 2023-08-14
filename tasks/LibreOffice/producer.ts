import { ProducerParameters, ProducerReturned } from "../../src/types/class";
import { Err, Ok, Result } from "ts-results";
import { log } from "../../src/utils";
import path from "path";
import { release } from "../../src/p7zip";

import shell from "shelljs";
import fs from "fs";
import TOML from "@iarna/toml";
import { NepWorkflow } from "../../src/types/nep";

export default async function (
  p: ProducerParameters,
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
      source_file: "LibreOfficePortable.exe",
      target_name: "LibreOffice",
    },
    // link2:{
    //   name:"Link Calc",
    //   step:"Link",
    //   source_file:"LibreOfficeCalcPortable.exe",
    //   target_name:"LibreOfficeCalc"
    // },
    // link3:{
    //   name:"Link Draw",
    //   step:"Link",
    //   source_file:"LibreOfficeDrawPortable.exe",
    //   target_name:"LibreOfficeDraw"
    // },
    // link4:{
    //   name:"Link Impress",
    //   step:"Link",
    //   source_file:"LibreOfficeImpressPortable.exe",
    //   target_name:"LibreOfficeImpress"
    // },
    // link5:{
    //   name:"Link Math",
    //   step:"Link",
    //   source_file:"LibreOfficeMathPortable.exe",
    //   target_name:"LibreOfficeMath"
    // },
    // link6:{
    //   name:"Link Base",
    //   step:"Link",
    //   source_file:"LibreOfficeBasePortable.exe",
    //   target_name:"LibreOfficeBase"
    // },
    // link7:{
    //   name:"Link Writer",
    //   step:"Link",
    //   source_file:"LibreOfficeWriterPortable.exe",
    //   target_name:"LibreOfficeWriter"
    // },
  };
  fs.writeFileSync(path.join(wfp, "setup.toml"), TOML.stringify(setup as any));

  // fs.writeFileSync(
  //   path.join(workshop, "_ready", taskName + ".wcs"),
  //   "FILE X:\\Program Files\\Edgeless\\LibreOffice->X:\\Users\\PortableApps\\LibreOffice\n" +
  //     "LINK X:\\Users\\Default\\Desktop\\LibreOfficeBase,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeBasePortable.exe\n" +
  //     "LINK X:\\Users\\Default\\Desktop\\LibreOfficeCalc,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeCalcPortable.exe\n" +
  //     "LINK X:\\Users\\Default\\Desktop\\LibreOfficeDraw,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeDrawPortable.exe\n" +
  //     "LINK X:\\Users\\Default\\Desktop\\LibreOfficeImpress,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeImpressPortable.exe\n" +
  //     "LINK X:\\Users\\Default\\Desktop\\LibreOfficeMath,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeMathPortable.exe\n" +
  //     "LINK X:\\Users\\Default\\Desktop\\LibreOffice,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficePortable.exe\n" +
  //     "LINK X:\\Users\\Default\\Desktop\\LibreOfficeWriter,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeWriterPortable.exe"
  // );
  //Return ready directory
  return new Ok({
    readyRelativePath: "_ready",
  });
}
