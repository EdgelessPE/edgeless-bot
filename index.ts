import fs from "fs"
import chalk from "chalk"
import { Status } from "./src/enum"
import { log, cleanBuildStatus } from './src/utils'
import { DatabaseNode, Task } from "./src/class"
import { readDatabase, saveDatabase } from "./src/database"
import { beforeRunCheck, cleanWorkshop, find7zip } from "./src/init"
import { spawnAria2, readTaskConfig, processTask, getTasks, aria2 } from './src/task'
import { DIR_TASKS } from "./src/const"
import { barometer } from "./src/barometer"
export const args: any = require("minimist")(process.argv.slice(2))


//main
async function main() {
    console.clear();
    let failureTasks: Array<string> = [];

    //获取版本号
    let project_ver = "0.0.0"
    if (fs.existsSync("./package.json")) {
        project_ver = JSON.parse(fs.readFileSync("./package.json").toString()).version
    }
    console.log(
        chalk.cyan.bold("Edgeless Bot ver." + project_ver)
    );

    //提醒debug模式
    if(args.hasOwnProperty("d")){
        log("Warning:Running at debug mode,remote operations and database update will be disabled")
    }

    //初始化
    if(args.hasOwnProperty("g")){
        console.log("::group::Init")
    }
    log("Info:Launching,please hold a second...");
    if (!beforeRunCheck(args.hasOwnProperty("g"))) {
        throw "Initialization failed";
    }
    if (!cleanWorkshop()) {
        throw "Cleaning workshop failed";
    }

    if (!(await spawnAria2())) {
        throw "Spawn Aria2 failed";
    }

    let p7zip = find7zip().unwarp();

    //读入数据库
    let DB = readDatabase();
    //log("Info:Get database as follow:")
    //console.log(JSON.stringify(DB))

    //校验数据库
    let null_db_node = new DatabaseNode()
    for (let dbKey in DB) {
        let node = DB[dbKey] as DatabaseNode
        for (let nodeKey in null_db_node) {
            if (!node.hasOwnProperty(nodeKey)) {
                log("Error:Database check failure," + dbKey + "'s key " + nodeKey + " not defined")
                throw "Database check failure"
            }
        }
    }
    if(args.hasOwnProperty("g")){
        console.log("::endgroup::")
    }

    //根据命令行参数判断任务
    if (args.hasOwnProperty("t")) {
        //只执行单一任务
        let taskName: string = args.t

        //校验任务文件夹是否存在
        if (taskName == null || taskName == "" || !fs.existsSync(DIR_TASKS + "/" + taskName)) {
            throw "Error:Task " + taskName + " not exist"
        } else {
            log("Info:Argument t caught,run task " + taskName)

            //读取task配置
            let iRT = readTaskConfig(taskName);
            if (iRT.status === Status.ERROR) {
                log("Error:Can't read " + taskName + "'s config,exit");

                //读取数据库中对应节点
                let dbNode = DB[taskName] as DatabaseNode;
                if (!dbNode) dbNode = new DatabaseNode();

                //写数据库构建情况
                dbNode.recentStatus.push({
                    time: Date.now(),
                    timeDescription: Date(),

                    success: false,
                    errorMessage: "Error:Can't read " + taskName + "'s config:" + iRT.payload
                })
                DB[taskName] = dbNode
                return;
            }
            let taskConfig = iRT.payload as Task;

            //读取数据库中对应节点
            let dbNode = DB[taskName] as DatabaseNode;
            if (!dbNode) dbNode = new DatabaseNode();

            //清理过多的构建状态信息
            if (dbNode.recentStatus.length > 2) {
                dbNode.recentStatus = cleanBuildStatus(dbNode.recentStatus)
            }

            //执行task
            let iPT = await processTask(taskConfig, dbNode, p7zip);
            if (iPT.status === Status.ERROR) {
                //打印错误
                log(iPT.payload);

                //写数据库构建情况
                dbNode.recentStatus.push({
                    time: Date.now(),
                    timeDescription: Date(),

                    success: false,
                    errorMessage: iPT.payload
                })
                DB[taskName] = dbNode
            } else {
                //task运行成功
                log("Success:Task " + taskName + " executed successfully");
                //写入数据库
                let node = iPT.payload as DatabaseNode
                node.recentStatus.push({
                    time: Date.now(),
                    timeDescription: Date(),

                    success: true,
                    errorMessage: "Success"
                })
                DB[taskName] = node
            }
        }
    } else {
        //执行全部Tasks

        //读入Tasks
        let tasks: Array<string> = getTasks();
        log("Info:Got " + tasks.length + " tasks in queue");

        //顺次执行Tasks
        for (let i = 0; i < tasks.length; i++) {
            console.log("\nProgress:" + (i + 1) + "/" + tasks.length)

            let taskName = tasks[i];

            //为GA输出分组
            if(args.hasOwnProperty("g")){
                console.log("::group::"+taskName)
            }

            //读取task配置
            let iRT = readTaskConfig(taskName);
            if (iRT.status === Status.ERROR) {
                log("Error:Can't read " + taskName + "'s config,skipping...");

                //读取数据库中对应节点
                let dbNode = DB[taskName] as DatabaseNode;
                if (!dbNode) dbNode = new DatabaseNode();

                //记录错误
                failureTasks.push(taskName);

                //写数据库构建情况
                dbNode.recentStatus.push({
                    time: Date.now(),
                    timeDescription: Date(),

                    success: false,
                    errorMessage: "Error:Can't read " + taskName + "'s config:" + iRT.payload
                })
                DB[taskName] = dbNode
                continue;
            }
            let taskConfig = iRT.payload as Task;

            //读取数据库中对应节点
            let dbNode = DB[taskName] as DatabaseNode;
            if (!dbNode) dbNode = new DatabaseNode();

            //清理过多的构建状态信息
            if (dbNode.recentStatus.length > 2) {
                dbNode.recentStatus = cleanBuildStatus(dbNode.recentStatus)
            }

            //执行task
            let iPT = await processTask(taskConfig, dbNode, p7zip);
            if (iPT.status === Status.ERROR) {
                //打印错误
                log(iPT.payload);

                //记录错误
                failureTasks.push(taskName);

                //写数据库构建情况
                dbNode.recentStatus.push({
                    time: Date.now(),
                    timeDescription: Date(),

                    success: false,
                    errorMessage: iPT.payload
                })
                DB[taskName] = dbNode
            } else {
                //task运行成功
                log("Success:Task " + taskName + " executed successfully");
                //写入数据库
                let node = iPT.payload as DatabaseNode
                node.recentStatus.push({
                    time: Date.now(),
                    timeDescription: Date(),

                    success: true,
                    errorMessage: "Success"
                })
                DB[taskName] = node
            }

            //为GA输出结束分组
            if(args.hasOwnProperty("g")){
                console.log("::endgroup::")
            }
        }

        //总结
        console.log("=================================================")
        if (failureTasks.length === 0) {
            log("Success:Everything is Okay");
        } else {
            log(
                "Warning:" +
                failureTasks.length +
                " tasks failed as follow:" +
                failureTasks.toString()
            );
        }
    }

    //打印晴雨表
    barometer(DB)
    console.log("=================================================")

    //写数据库
    if(!args.hasOwnProperty("d")){
        saveDatabase(DB);
    }else{
        log("Warning:Database not updated")
    }

    //停止aria2进程
    await aria2.forceShutdown();
    log("Info:Aria2 assassinated,exit");

    //如果Actions全局执行出现问题则在此处抛出
    if (args.hasOwnProperty("g") && !args.hasOwnProperty("t") && failureTasks.length > 0) {
        throw "TASK FAILURE"
    }
}

main().catch((e) => { throw e })