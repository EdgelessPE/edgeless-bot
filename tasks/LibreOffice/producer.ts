import { ProducerParameters, ProducerReturned } from "../../src/types/class";
import { Err, Ok, Result } from "ts-results";
import { log, writeGBK } from "../../src/utils";
import path from "path";
import { release } from "../../src/p7zip";

import shell from "shelljs";

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
  writeGBK(
    path.join(workshop, "_ready", taskName + ".wcs"),
    "FILE X:\\Program Files\\Edgeless\\LibreOffice->X:\\Users\\PortableApps\\LibreOffice\n" +
      "LINK X:\\Users\\Default\\Desktop\\LibreOfficeBase,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeBasePortable.exe\n" +
      "LINK X:\\Users\\Default\\Desktop\\LibreOfficeCalc,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeCalcPortable.exe\n" +
      "LINK X:\\Users\\Default\\Desktop\\LibreOfficeDraw,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeDrawPortable.exe\n" +
      "LINK X:\\Users\\Default\\Desktop\\LibreOfficeImpress,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeImpressPortable.exe\n" +
      "LINK X:\\Users\\Default\\Desktop\\LibreOfficeMath,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeMathPortable.exe\n" +
      "LINK X:\\Users\\Default\\Desktop\\LibreOffice,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficePortable.exe\n" +
      "LINK X:\\Users\\Default\\Desktop\\LibreOfficeWriter,X:\\Users\\PortableApps\\LibreOffice\\LibreOfficeWriterPortable.exe"
  );
  //Return ready directory
  return new Ok({
    readyRelativePath: "_ready",
    mainProgram:"LibreOfficePortable.exe"
  });
}
