import { ProducerParameters, ProducerReturned } from "../../src/class";
import { Ok, Result } from "ts-results";
import { log, writeGBK } from "../../src/utils";
import path from "path";
import { release } from "../../src/p7zip";

const shell = require("shelljs");

export default async function (
  p: ProducerParameters
): Promise<Result<ProducerReturned, string>> {
  const { taskName, downloadedFile, workshop } = p;

  const readyDir = path.join(workshop, "_ready", taskName);
  shell.mkdir("-p", path.join(workshop, "_ready"));
  log(`Info: ${downloadedFile}`);
  release(path.join(workshop, downloadedFile), readyDir);
  shell.mv(path.join(workshop, downloadedFile.split(".")[0]), readyDir);
  shell.rm("-rf", path.join(readyDir, "$PLUGINSDIR"));
  shell.rm("-rf", path.join(readyDir, "Other"));
  writeGBK(
    path.join(workshop, "_ready", taskName + ".wcs"),
    "FILE X:\\Program Files\\Edgeless\\OpenOffice->X:\\Users\\PortableApps\\OpenOffice\n" +
      "LINK X:\\Users\\Default\\Desktop\\OpenOfficeBase,X:\\Users\\PortableApps\\OpenOffice\\OpenOfficeBasePortable.exe\n" +
      "LINK X:\\Users\\Default\\Desktop\\OpenOfficeCalc,X:\\Users\\PortableApps\\OpenOffice\\OpenOfficeCalcPortable.exe\n" +
      "LINK X:\\Users\\Default\\Desktop\\OpenOfficeDraw,X:\\Users\\PortableApps\\OpenOffice\\OpenOfficeDrawPortable.exe\n" +
      "LINK X:\\Users\\Default\\Desktop\\OpenOfficeImpress,X:\\Users\\PortableApps\\OpenOffice\\OpenOfficeImpressPortable.exe\n" +
      "LINK X:\\Users\\Default\\Desktop\\OpenOfficeMath,X:\\Users\\PortableApps\\OpenOffice\\OpenOfficeMathPortable.exe\n" +
      "LINK X:\\Users\\Default\\Desktop\\OpenOffice,X:\\Users\\PortableApps\\OpenOffice\\OpenOfficePortable.exe\n" +
      "LINK X:\\Users\\Default\\Desktop\\OpenOfficeWriter,X:\\Users\\PortableApps\\OpenOffice\\OpenOfficeWriterPortable.exe"
  );
  //Return ready directory
  return new Ok({
    readyRelativePath: "_ready",
  });
}
