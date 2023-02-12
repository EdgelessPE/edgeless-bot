import { Err, Ok, Result } from "ts-results";
import path from "path";
import fs from "fs";
import { ProducerReturned, TaskInstance, WorkerDataProducer } from "./types/class";
import { piscina } from "./piscina";
import { config } from "./config";
import { getBadge } from "./badge";
import { log } from "./utils";
import { PROJECT_ROOT } from "./const";

interface ProducerSpawn {
  task: TaskInstance;
  downloadedFile: string;
  version: string;
}

function parsePath(entrance: string): Result<string, string> {
  const p = path.join(
    __dirname,
    "..",
    "templates",
    "producers",
    entrance + ".js"
  );
  if (fs.existsSync(p)) {
    return new Ok(p);
  } else {
    return new Err("Error:Can't find " + p);
  }
}

export default async function (
  s: ProducerSpawn
): Promise<Result<ProducerReturned, string>> {
  const { task, downloadedFile } = s;
  let scriptPath,
    isExternal = false;
  if (task.template.producer == "External") {
    //处理外置脚本
    scriptPath = path.join(
      __dirname,
      "..",
      config.DIR_TASKS,
      task.name,
      "producer.js"
    );
    if(!fs.existsSync(scriptPath)){
      return new Err("Error:Missing producer.ts in task directory")
    }
    isExternal = true;
  } else {
    //处理模板
    const r = parsePath(task.template.producer);
    if (r.err) {
      return r;
    }
    scriptPath = r.unwrap();
  }
  //安排worker
  const badge = getBadge("Producer");
  const wd: WorkerDataProducer = {
    badge,
    isExternal,
    scriptPath,
    task: {
      taskName: task.name,
      version: s.version,
      workshop: path.join(PROJECT_ROOT, config.DIR_WORKSHOP, task.name),
      downloadedFile,
      requiredObject: task.producer_required,
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
