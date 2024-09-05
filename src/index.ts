import { log, sleep } from "./utils";
import scraper from "./scraper";
import Piscina from "piscina";
import {
  executeTasks,
  getAllTasks,
  getSingleTask,
  getTasksToBeExecuted,
  removeExtraBuilds,
  reserveTask,
} from "./task";
import { config } from "./config";
import { ensurePlatform } from "./platform";
import { clearWorkshop } from "./workshop";
import { initAria2c, stopAria2c } from "./aria2c";
import {
  modified,
  readDatabase,
  report,
  setDatabaseNodeFailure,
  setDatabaseNodeSuccess,
  writeDatabase,
} from "./database";
import { login, uploadToRemote } from "./cloud189";
import art from "./art";
import cp from "child_process";
import { TaskInstance } from "./class";
import { setMVTDayToday } from "./const";
import { printLoadEnvNotices } from "./env";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("source-map-support").install();

async function main(): Promise<boolean> {
  // 打印艺术字
  art();
  // 打印环境变量加载
  printLoadEnvNotices();
  // GA模式特殊处理
  if (config.GITHUB_ACTIONS) {
    console.log("::group::Console Log");
    // 获取database
    if (config.DATABASE_UPDATE && config.REMOTE_ENABLE) {
      cp.execSync(
        "rclone copy kanuo:/www/wwwroot/cloud.edgeless.top/Bot/database.json ./",
      );
      log("Info:Database pulled");
      const loginRes = login();
      if (!loginRes) {
        return false;
      }
    } else {
      // 从https获得只读数据库
      cp.execSync(
        "curl https://cloud.edgeless.top/Bot/database.json -o database.json",
      );
      log("Info:Readonly database pulled");
    }
  }
  // 处理无版本号任务的制作日
  if (config.MODE_FORCED) setMVTDayToday();
  // 平台命令校验
  const platformMode = ensurePlatform();
  if (platformMode == "Unavailable") {
    return false;
  }
  // 重建工作目录
  if (!clearWorkshop()) {
    log("Error:Can't keep workshop clear : " + config.DIR_WORKSHOP);
    return false;
  }
  // 启动aria2c
  if (!(await initAria2c())) {
    log("Error:Can't initiate aria2c");
    return false;
  }
  // 读取数据库
  readDatabase();
  // 读取全部任务
  let tasks: TaskInstance[], task: TaskInstance;
  if (config.SPECIFY_TASK) {
    // 分割分别获取任务
    tasks = [];
    for (const t of config.SPECIFY_TASK.toString().split(/[,\s]/)) {
      task = getSingleTask(t).unwrap();
      // 判断是否保留任务
      if (!reserveTask(task)) {
        continue;
      }
      tasks.push(task);
    }
  } else {
    tasks = getAllTasks().unwrap();
  }
  // 执行全部爬虫
  const results = await scraper(tasks);
  // console.log(JSON.stringify(results,null,2))

  // 得到需要制作的任务
  const toExecTasks = getTasksToBeExecuted(results);

  // 执行任务
  const eRes = await executeTasks(toExecTasks);
  for (const node of eRes) {
    if (node.result.ok) {
      const task = getSingleTask(node.taskName).unwrap();
      // 上传
      if (uploadToRemote(node.result.val, task.category)) {
        // 去重
        const newBuilds = removeExtraBuilds(
          node.taskName,
          task.category,
          node.result.val,
        );
        setDatabaseNodeSuccess(node.taskName, newBuilds);
      } else {
        setDatabaseNodeFailure(node.taskName, "Error:Can't upload target file");
      }
    } else {
      setDatabaseNodeFailure(node.taskName, node.result.val);
    }
  }

  // 保存数据库
  writeDatabase();
  // 停止aria2c
  await stopAria2c();
  // 打印报告
  if (config.GITHUB_ACTIONS) {
    console.log("::endgroup::");
  }
  return report();
}

// interface TaskTemp {
//   name: string;
//   author: string;
//   category: string;
// }

// async function test(): Promise<boolean> {
//   const oldTasksDir =
//       "D:\\Desktop\\Projects\\EdgelessPE\\edgeless-bot-master\\tasks",
//     newTasksDir = "D:\\Desktop\\Projects\\EdgelessPE\\edgeless-bot\\tasks";
//   //读取两侧文件夹
//   const o = fs.readdirSync(oldTasksDir),
//     n = fs.readdirSync(newTasksDir);
//   //读取旧任务
//   const oTasks: TaskTemp[] = [];
//   let tmp;
//   for (const taskName of o) {
//     tmp = JSON.parse(
//       fs
//         .readFileSync(path.join(oldTasksDir, taskName, "config.json"))
//         .toString(),
//     );
//     oTasks.push(tmp);
//   }
//   //读取新任务
//   const nTasks: TaskTemp[] = [];
//   for (const taskName of n) {
//     tmp = TOML.parse(
//       fs
//         .readFileSync(path.join(newTasksDir, taskName, "config.toml"))
//         .toString(),
//     );
//     nTasks.push(tmp.task);
//   }
//   const getNode = (taskName: string, list: TaskTemp[]): TaskTemp | null => {
//     let r = null;
//     for (const n of list) {
//       if (n.name == taskName) {
//         r = n;
//         break;
//       }
//     }
//     return r;
//   };
//   let m;
//   //检查移植遗漏
//   for (const n of oTasks) {
//     m = getNode(n.name, nTasks);
//     if (m == null) {
//       log(`Warning:Missing ${n.name}`);
//     }
//   }
//   //检查对应
//   for (const n of nTasks) {
//     m = getNode(n.name, oTasks);
//     if (m == null) {
//       log(`Info:New task ${n.name}`);
//     } else {
//       if (n.author != m.author) {
//         log(`Warning:Author not match ${m.author}->${n.author},task ${n.name}`);
//       }
//       if (n.category != m.category) {
//         log(`Error:Category not match ${m.author}->${n.author},task ${n.name}`);
//       }
//     }
//   }

//   return true;
// }

if (!Piscina.isWorkerThread) {
  main().then(async (result) => {
    await sleep(1000);
    if (config.GITHUB_ACTIONS && config.DATABASE_UPDATE && modified) {
      // 回传数据库
      cp.execSync(
        "rclone copy ./database.json kanuo:/www/wwwroot/cloud.edgeless.top/Bot/",
      );
      log("Info:Database pushed");
    }
    process.exit(result ? 0 : 1);
  });
}
