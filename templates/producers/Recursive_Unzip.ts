import { ProducerParameters, ProducerReturned } from "../../src/types/class";
import fs from "fs";
import { Err, Ok, Result } from "ts-results";
import path from "path";
import { log, sleep } from "../../src/utils";
import { release } from "../../src/p7zip";
import os from "os";
import cp from "child_process";

import shell from "shelljs";
import { NepWorkflow } from "../../src/types/nep";
import TOML from "@iarna/toml";

interface RequiredObject {
  recursiveUnzipList: Array<string>;
  sourceFile: string;
  shortcutName: string;
}

function matchFile(cwd: string, regex: string): Result<string, string> {
  const dir = fs.readdirSync(cwd),
    r = new RegExp(regex.slice(1, -1));
  let m = undefined;
  for (const name of dir) {
    if (name.match(r) != null) {
      m = name;
      break;
    }
  }
  if (m == undefined) {
    return new Err("");
  } else {
    return new Ok(m);
  }
}

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  // 递归解压
  let cwd = p.workshop,
    level = 1,
    success = true,
    reason = "",
    m,
    file: string;
  const obj = p.requiredObject as RequiredObject;
  for (const reg of [p.downloadedFile].concat(obj.recursiveUnzipList)) {
    // 校验文件是否存在
    if (reg[0] == "/") {
      m = matchFile(cwd, reg);
      if (m.err) {
        if (level == 1) {
          log(
            `Error:Check if you are trying to match the download file with the first regex in recursiveUnzipList.If so, remove it.`,
          );
        }
        reason = `Error:Can't find file matching ${reg} at ${cwd} during the ${level}th recursion`;
        success = false;
        break;
      }
      file = m.val;
    } else {
      file = reg;
    }
    // 判断是文件夹还是文件
    if (fs.statSync(path.join(cwd, file)).isDirectory()) {
      cwd = cwd + "/" + file;
    } else {
      // 尝试解压
      success = await release(file, level.toString(), true, cwd);
      if (!success) {
        reason = `Error:Can't unzip file ${file} at ${cwd} during the ${level} recursion`;
        success = false;
        break;
      }
      // 准备下次递归
      cwd = path.join(cwd, level.toString());
      level++;
    }
  }
  if (!success) {
    return new Err(reason);
  }
  // 处理正则表达式的sourceFile
  if (obj.sourceFile[0] == "/") {
    // 读取当前目录，匹配对应的文件
    const list = fs.readdirSync(cwd);
    const regexp = new RegExp(obj.sourceFile.slice(1, -1));
    const matchRes = list.find((file) => {
      return regexp.test(file);
    });
    if (matchRes == undefined) {
      return new Err(
        `Error:Can't match source file with regex ${obj.sourceFile} in ${cwd}`,
      );
    } else {
      log(`Info:Matched source file : ${matchRes}`);
      obj.sourceFile = matchRes;
    }
  }
  // 确认是否存在目标文件
  if (!fs.existsSync(path.join(cwd, obj.sourceFile))) {
    return new Err(`Error:Can't find source file ${obj.sourceFile} in ${cwd}`);
  }
  // 重命名
  const final = path.join(p.workshop, "_ready");
  shell.mkdir(final);
  shell.mv(cwd, path.join(final, p.taskName));
  if (!fs.existsSync(path.join(final, p.taskName, obj.sourceFile))) {
    if (os.platform() == "win32") {
      log(
        `Info:Try to fix move with command : ` +
          `move /y "${cwd}" "${path.join(final, p.taskName)}"`,
      );
      await sleep(3000);
      cp.execSync(`move /y "${cwd}" "${path.join(final, p.taskName)}"`);
    } else log(`Error:Can't move ${cwd} to ${path.join(final, p.taskName)}`);
  }

  // 生成 setup.toml
  const setupWorkflow: NepWorkflow = {
    link: {
      name: "Create Shortcut",
      step: "Link",
      source_file: obj.sourceFile,
      target_name: obj.shortcutName,
    },
  };
  const wfPath = path.join(final, "workflows");
  shell.mkdir("-p", wfPath);
  fs.writeFileSync(
    path.join(wfPath, "setup.toml"),
    TOML.stringify(setupWorkflow as any),
  );

  // 自检
  const exist = function (p: string): boolean {
    return fs.existsSync(path.join(final, p));
  };
  if (
    exist(path.join("workflows", "setup.toml")) &&
    exist(p.taskName + "/" + obj.sourceFile)
  ) {
    return new Ok({
      readyRelativePath: "_ready",
      mainProgram: obj.sourceFile,
    });
  } else {
    return new Err(
      "Error:Recursive_Unzip self check failed due to file missing in ready folder",
    );
  }
}
