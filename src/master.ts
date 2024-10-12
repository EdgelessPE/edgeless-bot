import { ScraperReturned, TaskInstance } from "./class";
import { Result } from "ts-results";
import path from "path";
import { parentPort, Worker, workerData as obj } from "worker_threads";

// 输入一个同域任务数组然后同步顺次执行的Worker
async function master(
  tasks: Array<TaskInstance>,
  entrance: string,
): Promise<Array<Result<ScraperReturned, string>>> {
  return new Promise((resolve) => {
    const scriptPath = path.join(
      __dirname,
      "templates",
      "scrapers",
      `${entrance}.js`,
    );
    // 启动Worker
    const worker = new Worker(scriptPath, { workerData: tasks });
    // 监听完成
    worker.on("message", (outcome: Array<Result<ScraperReturned, string>>) => {
      // console.log(JSON.stringify(outcome))
      worker.terminate();
      resolve(outcome);
    });
  });
}

async function main() {
  const res = await master(obj.tasks, obj.entrance);
  parentPort?.postMessage(res);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
main().then(() => {});
