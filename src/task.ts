import fs from "fs";
import path from "path";
import {Err, Ok, Result} from "ts-results";
import {ScraperReturned, TaskInstance} from "./class";
import {config} from "./config";
import toml from "toml";
import {Cmp, log, matchVersion, schemaValidator, versionCmp} from "./utils";
import {getDatabaseNode, setDatabaseNodeFailure} from "./database";
import {ResultNode} from "./scraper";

interface TaskConfig {
    task: {
        name: string;
        author: string;
        category: string;
        url: string;
    };
    template: {
        scraper?: string;
        resolver?: string;
        producer: string;
    };
    regex?: {
        download_link?: string;
        download_name?: string;
        scraper_version?: string;
    };
    parameter: {
        build_manifest: Array<string>
        build_cover?: string;
        resolver_cd?: Array<string>;
        compress_level?: number;
    };
    producer_required: any;
    extra?: {
        require_windows?: boolean;
        missing_version?: boolean;
    };
}

function validateConfig(task: any): boolean {
    return schemaValidator(task, "task").unwrap()
}

function getSingleTask(taskName: string): Result<TaskInstance, string> {
    const taskConfigFile = path.join(process.cwd(), config.DIR_TASKS, taskName, "config.toml")
    if (!fs.existsSync(path.join(taskConfigFile))) {
        return new Err("Error:Can't find config.toml for " + taskName)
    } else {
        const text = fs.readFileSync(taskConfigFile).toString()
        let json
        try {
            json = toml.parse(text) as TaskConfig
        } catch (e) {
            console.log(JSON.stringify(e))
            return new Err("Error:Can't parse config.toml for " + taskName)
        }
        if (!validateConfig(json)) {
            return new Err("Error:Can't validate config.toml for " + taskName)
        } else {
            let res: any = json
            res["name"] = json.task.name
            res["author"] = json.task.author
            res["category"] = json.task.category
            res["pageUrl"] = json.task.url
            return new Ok(res)
        }
    }

}

function getAllTasks(): Result<Array<TaskInstance>, string> {
    const tasksDir = path.join(process.cwd(), config.DIR_TASKS)
    if (!fs.existsSync(tasksDir)) {
        return new Err("Error:Task directory not exist : " + tasksDir)
    }
    let dirList = fs.readdirSync(tasksDir)
    let result = [], success = true, tmp
    for (let taskName of dirList) {
        tmp = getSingleTask(taskName)
        if (tmp.err) {
            success = false
            log(tmp.val)
        } else {
            result.push(tmp.unwrap())
        }
    }
    if (success) {
        return new Ok(result)
    } else {
        return new Err("Error:Fatal error occurred when reading tasks")
    }
}

function getTasksToBeExecuted(results: ResultNode[]): Array<{
    task: TaskInstance,
    info: ScraperReturned
}> {
    //逐个判断是否需要执行制作
    let makeList: Array<{
        task: TaskInstance,
        info: ScraperReturned
    }> = []
    let db, newNode: ScraperReturned, matchRes, res, onlineVersion
    for (let result of results) {
        db = getDatabaseNode(result.taskName)
        //处理爬虫出错
        if (result.result.err) {
            setDatabaseNodeFailure(result.taskName, result.result.val)
            continue
        }
        //进行版本号比较
        newNode = result.result.val as ScraperReturned
        matchRes = matchVersion(newNode.version)
        if (matchRes.err) {
            setDatabaseNodeFailure(result.taskName, "Error:Can't parse version returned by scraper")
            continue
        }
        onlineVersion = matchRes.val
        res = getSingleTask(result.taskName)
        switch (versionCmp(db.recent.latestVersion, onlineVersion)) {
            case Cmp.L:
                //需要更新
                if (res.err) {
                    log(res.val)
                    break
                }
                makeList.push({
                    task: res.val,
                    info: newNode
                })
                break
            case Cmp.G:
                //警告
                log(`Warning:Local version(${db.recent.latestVersion}) greater than online version(${onlineVersion})`)
                if (res.err) {
                    log(res.val)
                    break
                }
                if (config.MODE_FORCED) {
                    log("Warning:Forced rebuild " + result.taskName)
                    makeList.push({
                        task: res.val,
                        info: newNode
                    })
                }
                break
            default:
                if (res.err) {
                    log(res.val)
                    break
                }
                if (config.MODE_FORCED) {
                    log("Warning:Forced rebuild " + result.taskName)
                    makeList.push({
                        task: res.val,
                        info: newNode
                    })
                }
                break
        }
    }
    return makeList
}

function executeTasks(tasks: Array<{
    task: TaskInstance,
    info: ScraperReturned
}>): boolean {
    console.log("Run these:")
    console.log(tasks)
    return true
}

export {
    getAllTasks,
    getSingleTask,
    executeTasks,
    getTasksToBeExecuted
}
