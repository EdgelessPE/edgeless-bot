import { Err, Ok, Result } from "ts-results";
import path from "path";
import fs from "fs";
import {
  ProducerReturned,
  TaskInstance,
  WorkerDataProducer,
} from "../types/class";
import { piscina } from "../piscina";
import { config } from "../config";
import { getBadge } from "../utils/badge";
import { log, parseBuiltInValue } from "../utils";
import { PROJECT_ROOT } from "../const";

function parsePath(entrance: string): Result<string, string> {
  const p = path.resolve(
    __dirname,
    "..",
    "..",
    "templates",
    "producers",
    entrance + ".js",
  );
  if (fs.existsSync(p)) {
    return new Ok(p);
  } else {
    return new Err("Error:Can't find " + p);
  }
}

export default async function (s: {
  task: TaskInstance;
  downloadedFile: string;
  version: string;
  revisedVersion: string;
}): Promise<Result<ProducerReturned, string>> {
  const { task, downloadedFile } = s;
  let scriptPath,
    isExternal = false;
  if (task.template.producer == "External") {
    // 处理外置脚本
    scriptPath = path.resolve(
      __dirname,
      "..",
      "..",
      config.DIR_TASKS,
      task.name,
      "producer.js",
    );
    if (!fs.existsSync(scriptPath)) {
      return new Err("Error:Missing producer.ts in task directory");
    }
    isExternal = true;
  } else {
    // 处理模板
    const r = parsePath(task.template.producer);
    if (r.err) {
      return r;
    }
    scriptPath = r.unwrap();
  }

  // 解释producer_required的内置变量
  const requiredObject: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(
    task.producer_required as Record<string, unknown>,
  )) {
    requiredObject[key] =
      typeof val === "string"
        ? parseBuiltInValue(val, {
            taskName: task.name,
            latestVersion: s.version,
            downloadedFile: s.downloadedFile,
            revisedVersion: s.revisedVersion,
          })
        : val;
  }

  // 安排worker
  const badge = getBadge("Producer");
  const cleanTaskName = task.name.includes("_")
    ? task.name.split("_")[0]
    : task.name;
  const wd: WorkerDataProducer = {
    badge,
    isExternal,
    scriptPath,
    task: {
      taskName: cleanTaskName,
      version: s.version,
      workshop: path.resolve(PROJECT_ROOT, config.DIR_WORKSHOP, task.name),
      downloadedFile,
      requiredObject,
    },
  };
  const r = (await piscina.run(wd, { name: "producer" })) as Result<
    ProducerReturned,
    string
  >;
  if (r.err) {
    log("Error:Producer resolved error", badge);
  }
  return r;
}