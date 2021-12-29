import {ScraperParameters, ScraperReturned, TaskInstance} from "./class";
import {Result} from "ts-results";

//输入一个同域任务数组然后同步顺次执行的Worker
export default async function (
    tasks: Array<TaskInstance>,
    entrance: (p: ScraperParameters, badge: string) => Promise<Result<ScraperReturned, string>>,
    badge: string
): Promise<Array<Result<ScraperReturned, string>>> {
    let results: Array<Result<ScraperReturned, string>> = []

    for (let task of tasks) {
        results.push(await entrance({
            taskName: task.name,
            url: task.pageUrl,
            downloadLinkRegex: task.downloadLinkRegex,
            versionMatchRegex: task.versionMatchRegex
        }, badge))
    }
    return results
}
