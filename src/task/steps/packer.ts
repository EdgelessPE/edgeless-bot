import { ExecuteParameter, ProducerReturned } from "../../types/class";
import { getAuthorForFileName, matchVersion } from "../../utils";
import { genMeta, packIntoNep } from "../../cli/ept";
import path from "path";
import { Err, Ok, Result } from "ts-results";
import { PROJECT_ROOT } from "../../const";
import { config } from "../../config";
import shell from "shelljs";
import fs from "fs";

// 对 ready 目录进行打包并将其复制到 builds 目录的指定位置
export async function packer(
  t: ExecuteParameter,
  p: Ok<ProducerReturned>,
  {
    target,
    workshop,
    cleanTaskName,
    isExpandableAppend,
  }: {
    target: string;
    workshop: string;
    cleanTaskName: string;
    isExpandableAppend?: boolean;
  },
): Promise<Result<string, string>> {
  // 确定文件名
  const fileName = (() => {
    const { name } = t.task;
    if (name.includes("_")) {
      const [stem, _flags] = name.split("_");
      let flags = _flags;
      if (isExpandableAppend && !flags.includes("E")) {
        flags += "E";
      }
      return `${stem}_${
        matchVersion(t.info.version).val
      }_${getAuthorForFileName(t.task.author)}.${flags}.nep`;
    } else {
      let flagStr = p.val.flags?.length ? `.${p.val.flags.join("")}` : "";
      if (isExpandableAppend && !flagStr.includes("E")) {
        flagStr += "E";
      }
      return `${name}_${
        matchVersion(t.info.version).val
      }_${getAuthorForFileName(t.task.author)}${flagStr}.nep`;
    }
  })();

  // 打包
  if (!(await packIntoNep(target, path.resolve(workshop, fileName)))) {
    return new Err("Error:Packing failed");
  }
  const localStorageDir = path.resolve(
    PROJECT_ROOT,
    config.DIR_BUILDS,
    t.task.scope,
    cleanTaskName,
  );
  shell.mkdir("-p", localStorageDir);
  const storagePath = path.resolve(localStorageDir, fileName);
  if (fs.existsSync(storagePath)) {
    shell.rm("-f", storagePath);
  }
  shell.mv(path.resolve(workshop, fileName), storagePath);
  if (!fs.existsSync(storagePath)) {
    return new Err("Error:Moving compressed file to builds folder failed");
  }

  // 生成 meta
  const metaTarget = path.resolve(localStorageDir, fileName + ".meta");
  if (!(await genMeta(target, metaTarget))) {
    return new Err("Error:Generating meta failed");
  }

  return new Ok(fileName);
}
