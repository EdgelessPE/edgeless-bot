import {JsObjectType, ObjectValidationNode, ScraperParameters, ScraperReturned} from "../../class";
import {Err, Ok, Result} from "ts-results";
import {config} from "../../index";
import path from "path";
import fs from "fs";
import {awaitWithTimeout, log, objectValidator} from "../../utils";

export default async function (p: ScraperParameters, badge: string): Promise<Result<ScraperReturned, string>> {
    const {taskName} = p

    //载入脚本
    const scriptPath = path.join(process.cwd(), config.DIR_TASKS, taskName, "scraper.ts")
    if (!fs.existsSync(scriptPath)) {
        return new Err("Error:Can't find external scraper script : " + scriptPath)
    }
    const script = (await import(scriptPath)).default
    if (script == null || typeof script != 'function') {
        return new Err("Error:External scraper script didn't export a function")
    }

    //执行脚本
    let dirtyRes
    try {
        dirtyRes = await awaitWithTimeout(script, 30000) as Result<ScraperReturned, string>
    } catch (e) {
        return new Err("Error:External scraper script throw:\n" + JSON.stringify(e))
    }
    if (dirtyRes.err) {
        log(dirtyRes.val, badge)
        return new Err("Error:External scraper script resolved error")
    }
    let dirty = dirtyRes.unwrap()

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
