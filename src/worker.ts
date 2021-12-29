import {ScraperParameters, ScraperReturned, TaskInstance} from "./class";
import {Result} from "ts-results";

export default async function (
    badge: string,
    tasks: Array<TaskInstance>,
    entrance: (p: ScraperParameters, badge: string) => Promise<Result<ScraperReturned, string>>
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
