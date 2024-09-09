import { ExecuteParameter, ProducerReturned } from "../../types/class";
import { getAuthorForFileName, matchVersion } from "../../utils";
import { packIntoNep } from "../../cli/ept";
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
  }: {
    target: string;
    workshop: string;
    cleanTaskName: string;
  },
): Promise<Result<string, string>> {
  // 确定文件名
  const fileName = (() => {
    const { name } = t.task;
    if (name.includes("_")) {
      const [stem, flags] = name.split("_");
      return `${stem}_${
        matchVersion(t.info.version).val
      }_${getAuthorForFileName(t.task.author)}.${flags}.nep`;
    } else {
      const flagStr = p.val.flags?.length ? `.${p.val.flags.join("")}` : "";
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

  return new Ok(fileName);
}
