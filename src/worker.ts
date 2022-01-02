import {ScraperParameters, ScraperReturned, WorkerData} from "./class";
import {Err, Ok, Result} from "ts-results";
import {awaitWithTimeout} from "./utils";
import {TIMEOUT} from "./const";

async function scraper(workerData: WorkerData): Promise<Result<Array<Result<ScraperReturned, string>>, string>> {
    const dirtyScript = await import(workerData.scriptPath)
    if (dirtyScript == null || dirtyScript.default == null) {
        return new Err(`Error:${workerData.badge} imported null script : ${workerData.scriptPath}`)
    } else {
        if (workerData.isExternal) {
            //作为外置脚本处理
            const script = dirtyScript.default as () => Promise<Result<ScraperReturned, string>>
            let res
            try {
                res = (await awaitWithTimeout(script, TIMEOUT)) as Result<ScraperReturned, string>
                return new Ok([res])
            } catch (e) {
                return new Err(`Error:${workerData.badge} executed script failed : \n${JSON.stringify(e)}`)
            }
        } else {
            //作为模板处理
            const script = dirtyScript.default as (p: ScraperParameters) => Promise<Result<ScraperReturned, string>>
            let results: Array<Result<ScraperReturned, string>> = []
            let res
            for (let task of workerData.tasks) {
                try {
                    res = (await awaitWithTimeout(script, TIMEOUT, {
                        taskName: task.name,
                        url: task.pageUrl,
                        downloadLinkRegex: task.regex?.download_link,
                        versionMatchRegex: task.regex?.scraper_version
                    })) as Result<ScraperReturned, string>
                    results.push(res)
                } catch (e) {
                    results.push(new Err(`Error:${workerData.badge} executed script failed : \n${JSON.stringify(e)}`))
                }
            }
            return new Ok(results)
        }
    }
}

export {
    scraper
}
