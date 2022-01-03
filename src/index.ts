import {log, sleep} from "./utils";
import scraper from "./scraper";
import Piscina from "piscina";
import {executeTasks, getAllTasks, getSingleTask, getTasksToBeExecuted} from "./task";
import {config} from "./config";
import {ensurePlatform, getOS, OS} from "./platform";
import os from "os";
import {clearWorkshop} from "./workshop";
import {initAria2c, stopAria2c} from "./aria2c";
import {readDatabase, writeDatabase} from "./database";

async function main() {
    console.clear()
    //平台校验
    //TODO:支持其他平台
    if (getOS() != OS.Windows) {
        log("Error:Unsupported platform : " + os.platform())
        return
    }
    //命令校验
    if (!ensurePlatform()) {
        return
    }
    //重建工作目录
    if (!clearWorkshop()) {
        log("Error:Can't keep workshop clear : " + config.DIR_WORKSHOP)
        return
    }
    //启动aria2c
    if (!(await initAria2c())) {
        log("Error:Can't initiate aria2c")
        return
    }
    //读取数据库
    readDatabase()
    //读取全部任务
    let tasks = config.SPECIFY_TASK ? [getSingleTask(config.SPECIFY_TASK).unwrap()] : getAllTasks().unwrap()
    //执行全部任务爬虫
    let results = await scraper(tasks)
    //console.log(JSON.stringify(results,null,2))

    //得到需要真正执行的任务数组
    let toExecTasks = getTasksToBeExecuted(results)
    //TODO:检查爬虫提供的checksum信息是否有效

    //执行所有需要执行的任务
    let e = await executeTasks(toExecTasks)
    // if (e) {
    //     log("Error:Error occurred during executing tasks")
    //     if (config.GITHUB_ACTIONS) fs.writeFileSync("actions_failed", "Error")
    // }

    //去重，上传

    //写数据库
    writeDatabase()
    //停止aria2c
    await stopAria2c()
}

async function test() {
    //await compress("111","test.7z","D:\\Desktop\\Projects\\EdgelessPE\\edgeless-bot\\test",5)
    //await release("test.7z", "111", "D:\\Desktop\\Projects\\EdgelessPE\\edgeless-bot\\test", true)
}

if (!Piscina.isWorkerThread) main().then(async _ => {
    await sleep(1000)
    process.exit(0)
})
