import { ProducerParameters, ProducerReturned } from "../../src/class";
import { writeGBK, sleep, log } from "../../src/utils";
import { Err, Ok, Result } from "ts-results";
import path from "path";
import fs from "fs";
import cp from "child_process";
import os from "os";
import shell from "shelljs";

const INSTALLER="ToDesk_Setup.exe"

async function downloadInstaller(downloader:string):Promise<string> {
  //执行下载器
  const handler=cp.exec(downloader)
  //等待下载完成
  const {homedir}=os.userInfo()
  const watchPath=path.join(homedir,`Downloads/${INSTALLER}`)
  
  while (!fs.existsSync(watchPath)){
    sleep(1000)
  }

  handler.kill()
  try{
    cp.execSync(`taskkill /im ${INSTALLER}`)
  }catch(e){
    log(`Warning:Failed to close ${INSTALLER}, manually close it later`)
  }
  return watchPath
}

export default async function (
  p: ProducerParameters
): Promise<Result<ProducerReturned, string>> {
  const { taskName, downloadedFile, workshop, version } = p;

  //Create ready directory
  const readyDir = path.join(workshop, "_ready", taskName);
  shell.mkdir("-p", readyDir);

  //下载安装包
  const installerPath=await downloadInstaller(path.join(workshop,downloadedFile))
  shell.cp(installerPath,path.join(readyDir,INSTALLER))

  //Write command to external batch
  const cmd = `EXEC %ProgramFiles%\\Edgeless\\${taskName}\\${INSTALLER} /S`;
  writeGBK(path.join(workshop, "_ready", taskName + ".wcs"), cmd);

  //Naive self check
  const manifest = [`${taskName}.wcs`, `${taskName}/${INSTALLER}`].map(
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
