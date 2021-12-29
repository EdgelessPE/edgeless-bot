import {JsObjectType, ObjectValidationNode, ScraperParameters, ScraperReturned} from "../../class";
import {Err, Ok, Result} from "ts-results";
import {config} from "../../index";
import path from "path";
import fs from "fs";
import {awaitWithTimeout, log, objectValidator} from "../../utils";
import {parentPort, Worker, workerData} from "worker_threads";

let scriptPath = ""

async function work(): Promise<Result<ScraperReturned, string>> {
    return new Promise((resolve) => {
        //检查文件是否存在
        if (!fs.existsSync(scriptPath)) {
            return new Err("Error:Can't find external scraper script : " + scriptPath)
        }
        //创建Worker
        let worker = new Worker(scriptPath)
        //监听worker完成的信息
        worker.on("message", (res) => {
            worker.terminate()
            resolve(res)
        })
    })
}

async function single(p: ScraperParameters): Promise<Result<ScraperReturned, string>> {
    const {taskName} = p

    //载入脚本
    scriptPath = path.join(process.cwd(), "dist", config.DIR_TASKS, taskName, "scraper.js")
    if (!fs.existsSync(scriptPath)) {
        return new Err("Error:Can't find external scraper script : " + scriptPath)
    }

    //执行脚本
    let dirtyRes
    try {
        dirtyRes = await awaitWithTimeout(work, 30000) as Result<ScraperReturned, string>
    } catch (e) {
        return new Err("Error:External scraper script throw:\n" + JSON.stringify(e))
    }
    if (dirtyRes.err) {
        log(dirtyRes.val)
        return new Err("Error:External scraper script resolved error")
    }
    let dirty = dirtyRes.val

    //校验脏结果
    const checkList: Array<ObjectValidationNode> = [
        {
            key: "version",
            type: JsObjectType.string,
            required: true
        },
        {
            key: "downloadLink",
            type: JsObjectType.string,
            required: true
        },
        {
            key: "validation",
            type: JsObjectType.object,
            required: false,
            properties: [
                {
                    key: "type",
                    type: JsObjectType.numberOrEnum,
                    required: true
                },
                {
                    key: "value",
                    type: JsObjectType.string,
                    required: true
                }
            ]
        }
    ]
    if (objectValidator(dirty, checkList)) {
        return new Ok(dirty)
    } else {
        return new Err("Error:Returned result validation failed")
    }
}

(async () => {
    let results: Array<Result<ScraperReturned, string>> = []
    for (const task of workerData) {
        results.push((await single({
            taskName: task.name,
            url: task.pageUrl,
            downloadLinkRegex: task.downloadLinkRegex,
            versionMatchRegex: task.versionMatchRegex
        })))
    }
    parentPort?.postMessage(results)
})()
