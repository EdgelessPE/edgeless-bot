import fs from "fs";
import path from "path";
import {Err, Ok, Result} from "ts-results";
import {ExecuteParameter, ScraperReturned, TaskInstance} from "./class";
import {config} from "./config";
import toml from "toml";
import {Cmp, log, matchVersion, schemaValidator, shuffle, versionCmp} from "./utils";
import {getDatabaseNode, setDatabaseNodeFailure} from "./database";
import {ResultNode} from "./scraper";
import resolver from "./resolver";
import {download} from "./aria2c";
import checksum from "./checksum";
import producerRegister from "../templates/producers/_register"
import producer from "./producer";
import {compress} from "./p7zip";

const shell = require("shelljs")

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

interface ResultReport {
    taskName: string;
    result: Result<string, string> //成功时返回新构建的名称，失败返回错误消息
}

function validateConfig(task: any): boolean {
    //基础校验
    if (!schemaValidator(task, "task").unwrap()) {
        return false
    }
    //Producer模板配置正确性检查
    let suc = false
    for (let node of producerRegister) {
        if (node.entrance == task.template.producer) {
            suc = true
        }
    }
    if (!suc) {
        log(`Error:Producer template ${task.template.producer} not registered`)
        return false
    }
    if (!fs.existsSync(path.join("./schema", "producer_templates", task.template.producer + ".json"))) {
        log(`Error:Producer template schema file ${task.template.producer} not found`)
        return false
    }
    //producer_required检查
    return schemaValidator(task.producer_required, "producer_templates/" + task.template.producer, "/producer_required").unwrap();
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

async function execute(t: ExecuteParameter): Promise<Result<boolean, string>> {
    //解析直链
    let dRes = await resolver({
        downloadLink: t.info.downloadLink,
        fileMatchRegex: t.task.regex.download_name,
        cd: t.task.parameter.resolver_cd
    })
    if (dRes.err) {
        return dRes
    }
    //下载文件
    const workshop = path.join(process.cwd(), config.DIR_WORKSHOP, t.task.name)
    shell.mkdir(workshop)
    let downloadedFile: string
    try {
        downloadedFile = await download(t.task.name, dRes.val.directLink, workshop)
    } catch (e) {
        console.log(JSON.stringify(e))
        return new Err("Error:Can't download link" + dRes.val.directLink)
    }
    const absolutePath = path.join(workshop, downloadedFile)
    //校验文件
    if (t.info.validation && !(await checksum(absolutePath, t.info.validation.type, t.info.validation.value))) {
        return new Err(`Error:Can't validate downloaded file,expect ${t.info.validation.value}`)
    }
    //制作
    let p = await producer({
        task: t.task,
        downloadedFile
    })
    if (p.err) {
        log(p.val)
        return new Err(`Error:Can't produce task ${t.task.name}`)
    }
    //验收
    const target = path.join(config.DIR_WORKSHOP, t.task.name, p.val.readyRelativePath)
    const getBuildManifest = (): Array<string> => {
        let origin = t.task.parameter.build_manifest, final: Array<string> = []
        for (let cmd of t.task.parameter.build_manifest) {
            final.push(cmd.replace("${taskName}", t.task.name).replace("${downloadedFile}", downloadedFile))
        }
        return final
    }
    let pass = true
    for (let file of getBuildManifest()) {
        if (!fs.existsSync(path.join(target, file))) {
            pass = false
            log(`Error:Check manifest failed for ${t.task.name},missing ${file}`)
        }
    }
    if (!pass) {
        return new Err(`Error:Can't produce task ${t.task.name} due to build missing`)
    }
    //压缩
    let c = await compress(p.val.readyRelativePath, `${t.task.name}_${matchVersion(t.info.version).val}_${t.task.author}.7z`, workshop, t.task.parameter.compress_level ?? getDefaultCompressLevel(t.task.template.producer))
    return new Ok(true)
}

function getDefaultCompressLevel(templateName: string): number {
    let level = 5
    for (let node of producerRegister) {
        if (node.entrance == templateName) {
            level = node.defaultCompressLevel
            break
        }
    }
    return 5
}

async function executeTasks(ts: Array<ExecuteParameter>): Promise<Array<ResultReport>> {
    return new Promise(async (resolve, reject) => {
        console.log("Info:Starting executing tasks")
        const total = ts.length
        let done = 0, collection: Array<ResultReport> = []
        for (let t of shuffle(ts)) {
            execute(t).then((res) => {
                if (res.err) {
                    log(res.val)
                    collection.push({
                        taskName: t.task.name,
                        result: res
                    })
                } else if (!res.val) {
                    log(`Error:Task ${t.task.name} executed failed`)
                    collection.push({
                        taskName: t.task.name,
                        result: new Err("Error:Task executed failed")
                    })
                } else {
                    log(`Success:Task ${t.task.name} executed successfully`)
                    collection.push({
                        taskName: t.task.name,
                        result: new Ok(`${t.task.name}_${matchVersion(t.info.version).unwrap()}_${t.task.author}.7z`)
                    })
                }
                done++
                if (done == total) {
                    resolve(collection)
                }
            })
        }
    })
}

export {
    getAllTasks,
    getSingleTask,
    executeTasks,
    getTasksToBeExecuted
}
