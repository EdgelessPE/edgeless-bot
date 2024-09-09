import { Err, Ok, Result } from "ts-results";
import { TaskInstance } from "../types/class";
import path from "path";
import { config } from "../config";
import fs from "fs";
import toml from "toml";
import { VALID_FLAGS } from "../const";
import { reserveTask, validateConfig } from "./utils";
import { log } from "../utils";
import { TaskConfig } from "./index";

export function getSingleTask(taskName: string): Result<TaskInstance, string> {
  const taskConfigFile = path.resolve(
    process.cwd(),
    config.DIR_TASKS,
    taskName,
    "config.toml",
  );
  if (!fs.existsSync(path.resolve(taskConfigFile))) {
    return new Err("Error:Can't find config.toml for " + taskName);
  } else {
    const text = fs.readFileSync(taskConfigFile).toString();
    let json;
    try {
      json = toml.parse(text) as TaskConfig;
    } catch (e) {
      console.log(JSON.stringify(e));
      return new Err("Error:Can't parse config.toml for " + taskName);
    }
    if (taskName != json.task.name) {
      return new Err(
        `Error:Please keep the folder name (${taskName}) same with task name (${json.task.name})`,
      );
    }
    // 如果名称中有 _，检查是否合规
    if (taskName.includes("_")) {
      const sp = taskName.split("_");
      // 最多只能有一个下划线
      if (sp.length != 2) {
        return new Err(
          `Error:Invalid task name : ${taskName} : at most one '_' in task name`,
        );
      }
      // 检查 flags 是否符合要求
      for (const c of sp[1]) {
        if (!VALID_FLAGS.has(c)) {
          return new Err(
            `Error:Invalid task name : ${taskName} : invalid flag '${c}'`,
          );
        }
      }
    }
    if (!validateConfig(json)) {
      return new Err("Error:Can't validate config.toml for " + taskName);
    } else {
      const res = json as unknown as TaskInstance;
      res["name"] = json.task.name;
      res["author"] = json.task.author;
      res["scope"] = json.task.scope;
      res["description"] = json.task.description;
      res["language"] = json.task.language;
      res["tags"] = json.task.tags;
      res["category"] = json.task.category;
      res["pageUrl"] = json.task.url;
      res["license"] = json.task.license;
      return new Ok(res);
    }
  }
}

export function getAllTasks(): Result<Array<TaskInstance>, string> {
  const tasksDir = path.resolve(process.cwd(), config.DIR_TASKS);
  if (!fs.existsSync(tasksDir)) {
    return new Err("Error:Task directory not exist : " + tasksDir);
  }
  const dirList = fs.readdirSync(tasksDir),
    result = [];
  let success = true,
    tmp;
  log("Info:Loading tasks...");
  for (const taskName of dirList) {
    tmp = getSingleTask(taskName);
    if (tmp.err) {
      success = false;
      log(tmp.val);
    } else {
      const task = tmp.unwrap();
      if (!reserveTask(task)) {
        continue;
      }
      result.push(task);
    }
  }
  if (success) {
    return new Ok(result);
  } else {
    return new Err("Error:Fatal error occurred when reading tasks");
  }
}
