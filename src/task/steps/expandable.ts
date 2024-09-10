import { Err, Ok, Result } from "ts-results";
import { ExecuteParameter, ProducerReturned } from "../../types/class";
import shell from "shelljs";
import path from "path";
import { getBLAKE3 } from "../../utils/checksum";
import fs from "fs";
import { NepWorkflow } from "../../types/nep";
import { tomlStringify } from "../../utils";

// 根据原 ready 目录生成一个可展开包版本的新 ready 目录
// 返回新 ready 目录，如果返回 null 表示不支持生成可展开包版本
export async function produceExpandableReady(
  t: ExecuteParameter,
  p: ProducerReturned,
  {
    target,
    workshop,
  }: {
    target: string;
    workshop: string;
  },
): Promise<Result<string | null, string>> {
  // 判断是否支持可展开
  const downloadReplacePath =
    typeof t.task.parameter.expandable === "string"
      ? t.task.parameter.expandable
      : p.expandableContext?.downloadedFilePath;
  if (!downloadReplacePath || t.task.parameter.expandable === false) {
    return new Ok(null);
  }

  // 拷贝 ready
  const expandableReady = path.join(workshop, "__EXPANDABLE_READY__");
  shell.cp("-R", target, expandableReady);

  // 计算目标文件的哈希
  const downloadedFile = path.join(expandableReady, downloadReplacePath);
  if (!fs.existsSync(downloadedFile)) {
    return new Err(
      `Error:Failed to location downloaded file in '${expandableReady}' with '${downloadReplacePath}'"`,
    );
  }
  const hash_blake3 = await getBLAKE3(downloadedFile);

  // 删除此文件，写展开工作流
  shell.rm("-f", downloadedFile);
  const expandWorkflow: NepWorkflow = {
    download_bin: {
      step: "Download",
      url: t.info.downloadLink,
      hash_blake3,
      at: downloadReplacePath,
    },
  };
  const expandWorkflowFilePath = path.resolve(
    expandableReady,
    "workflows",
    "expand.toml",
  );
  fs.writeFileSync(expandWorkflowFilePath, tomlStringify(expandWorkflow));

  return new Ok(expandableReady);
}
