import { Ok, Result } from "ts-results";
import { ExecuteParameter, ResultReport } from "../types/class";
import { log, shuffle } from "../utils";
import { MISSING_VERSION_FLAG } from "../const";
import os from "os";
import { execute } from "./executor";

export async function executeTasks(
  ts: Array<ExecuteParameter>,
): Promise<Array<ResultReport>> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    if (ts.length == 0) {
      log("Info:No tasks to be executed");
      resolve([]);
      return;
    }
    const total = ts.length;
    let r = "";
    const normalTasks: Array<ExecuteParameter> = [],
      requireWindowsTasks: Array<ExecuteParameter> = [];
    ts.forEach((item) => {
      // 生成tip
      r = r + ` ${item.task.name}`;
      // 根据是否需要Windows分流
      if (item.task.extra?.require_windows) {
        requireWindowsTasks.push(item);
      } else {
        normalTasks.push(item);
      }
    });
    log(`Info:Starting executing ${total} tasks :${r}`);
    let done = 0;
    const collection: Array<ResultReport> = [];
    const collect = (
      res: Result<string[] | typeof MISSING_VERSION_FLAG, string>,
      t: ExecuteParameter,
    ) => {
      // 处理缺失版本号但是无更新的情况
      if (res.ok && res.val == MISSING_VERSION_FLAG) {
        log(
          `Success:Missing version task ${t.task.name} executed successfully`,
        );
      } else {
        // 处理正常情况
        if (res.err) {
          log(res.val);
          collection.push({
            taskName: t.task.name,
            result: res,
          });
        } else {
          log(`Success:Task ${t.task.name} executed successfully`);
          collection.push({
            taskName: t.task.name,
            result: res as Ok<string[]>,
          });
        }
      }
      // 已完成任务自增，并检查是否需要resolve
      done++;
      if (done == total) {
        resolve(collection);
      }
    };
    // 并发全部的普通任务
    for (const t of shuffle(normalTasks)) {
      collect(await execute(t), t);
    }
    // 顺序执行全部的require windows任务
    if (os.platform() == "win32") {
      for (const t of shuffle(requireWindowsTasks)) {
        collect(await execute(t), t);
      }
    }
  });
}
