import { ProducerParameters, ProducerReturned } from "../../src/types/class";
import { Ok, Result } from "ts-results";
import { log, pressEnter, sleep } from "../../src/utils";
import path from "path";
import fs from "fs";
import cp from "child_process";

import shell from "shelljs";
import { NepWorkflow } from "../../src/types/nep";
import TOML from "@iarna/toml";

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  const { downloadedFile, workshop } = p;

  // Create ready directory
  const readyDir = path.join(workshop, "_ready");
  shell.mkdir("-p", readyDir);

  // 移动安装程序
  shell.mv(path.join(workshop, downloadedFile), readyDir);
  // 启动安装程序
  const installer = cp.exec(downloadedFile, { cwd: readyDir }, () => {
    log("Info:Installer exit");
  });

  // 发送回车
  await pressEnter([5, 5, 2, 2]);

  // 循环判断安装完成
  const finishFilePath = path.join(
    readyDir,
    "uTorrentPortable/Data/PortableApps.comInstaller/license.ini",
  );
  while (!fs.existsSync(finishFilePath)) {
    await sleep(3000);
  }

  // 退出安装进程
  await pressEnter([3]);
  await sleep(1000);
  installer.kill();

  // 删除安装包
  shell.rm(path.join(readyDir, downloadedFile));

  // 清理
  const deleteList = [
    "Other",
    "help.html",
    "App/readme.txt",
    "App/AppInfo/*.ico",
    "App/AppInfo/*.png",
  ];
  for (const f of deleteList) {
    shell.rm("-rf", path.join(readyDir, "uTorrentPortable", f));
  }

  // 重命名目录为任务名
  shell.mv(
    path.join(readyDir, "uTorrentPortable"),
    path.join(readyDir, "uTorrent"),
  );

  // 写工作流
  const wfp = path.join(readyDir, "workflows");
  shell.mkdir("-p", wfp);
  const setup: NepWorkflow = {
    link: {
      name: "Create Shortcut",
      step: "Link",
      source_file: "uTorrentPortable.exe",
      target_name: "uTorrent",
    },
  };
  fs.writeFileSync(path.join(wfp, "setup.toml"), TOML.stringify(setup as any));

  // Return ready directory
  return new Ok({
    readyRelativePath: "_ready",
    mainProgram: "uTorrentPortable.exe",
  });
}
