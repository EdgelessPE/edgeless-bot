import {
    ResolverParameters,
    ResolverReturned,
    ScraperParameters,
    ScraperReturned,
    WorkerDataResolver,
    WorkerDataScraper
} from "./class";
import {Err, Ok, Result} from "ts-results";
import {awaitWithTimeout} from "./utils";
import {LIGHT_TIMEOUT} from "./const";

export let badge = "Worker"

async function scraper(workerData: WorkerDataScraper): Promise<Result<Array<Result<ScraperReturned, string>>, string>> {
    //修改工作牌
    badge = workerData.badge
    //执行脚本
    const dirtyScript = await import(workerData.scriptPath)
    if (dirtyScript == null || dirtyScript.default == null) {
        return new Err(`Error:Worker imported null script : ${workerData.scriptPath}`)
    } else {
        if (workerData.isExternal) {
            //作为外置脚本处理
            const script = dirtyScript.default as () => Promise<Result<ScraperReturned, string>>
            let res
            try {
                res = (await awaitWithTimeout(script, LIGHT_TIMEOUT)) as Result<ScraperReturned, string>
                return new Ok([res])
            } catch (e) {
                return new Err(`Error:Worker executed script failed : \n${JSON.stringify(e)}`)
            }
        } else {
            //作为模板处理
            const script = dirtyScript.default as (p: ScraperParameters) => Promise<Result<ScraperReturned, string>>
            let results: Array<Result<ScraperReturned, string>> = []
            let res
            for (let task of workerData.tasks) {
                try {
                    res = (await awaitWithTimeout(script, LIGHT_TIMEOUT, {
                        taskName: task.name,
                        url: task.pageUrl,
                        downloadLinkRegex: task.regex?.download_link,
                        versionMatchRegex: task.regex?.scraper_version
                    })) as Result<ScraperReturned, string>
                    results.push(res)
                } catch (e) {
                    results.push(new Err(`Error:Worker executed script failed : \n${JSON.stringify(e)}`))
                }
            }
            return new Ok(results)
        }
    }
}

async function resolver(workerData: WorkerDataResolver): Promise<Result<ResolverReturned, string>> {
    //修改工作牌
    badge = workerData.badge
    //执行脚本
    const dirtyScript = await import(workerData.scriptPath)
    if (dirtyScript == null || dirtyScript.default == null) {
        return new Err(`Error:Worker imported null script : ${workerData.scriptPath}`)
    } else {
        const script = dirtyScript.default as (p: ResolverParameters) => Promise<Result<ResolverReturned, string>>
        let res, url = workerData.url
        try {
            res = (await awaitWithTimeout(script, LIGHT_TIMEOUT, {
                downloadLink: url,
                fileMatchRegex: workerData.fileMatchRegex,
                cd: workerData.cd
            })) as Result<ResolverReturned, string>
        } catch (e) {
            return new Err(`Error:Worker executed script failed : \n${JSON.stringify(e)}`)
        }
        return res
    }
}

export {
    scraper,
    resolver
}
