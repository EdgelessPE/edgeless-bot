import {ScraperParameters, ScraperReturned, TaskInstance} from "./class";
import {Result} from "ts-results";
import path from "path";

//输入一个同域任务数组然后同步顺次执行的Worker
async function worker(
    tasks: Array<TaskInstance>,
    entrance: string,
    badge: string
): Promise<Array<Result<ScraperReturned, string>>> {
    let results: Array<Result<ScraperReturned, string>> = []
    const script = (await import(path.join(__dirname, "templates", "scrapers", entrance))).default as (p: ScraperParameters, badge: string) => Promise<Result<ScraperReturned, string>>

    for (let task of tasks) {
        results.push(await script({
            taskName: task.name,
            url: task.pageUrl,
            downloadLinkRegex: task.downloadLinkRegex,
            versionMatchRegex: task.versionMatchRegex
        }, badge))
    }
    return results
}

export default async (obj: any) => {
    return await worker(obj.tasks, obj.entrance, obj.badge)
}
