import path from "path";
import {ScraperRegister, ScraperReturned, TaskInstance} from "./class";
import {Err, Ok, Result} from "ts-results";
import scraperRegister from './templates/scrapers/_register'
import {log} from "./utils";
import chalk from "chalk";

const Piscina = require('piscina');

const piscina = new Piscina({
    filename: path.resolve(__dirname, 'worker.js')
});

interface ResultNode {
    taskName: string,
    result: Result<ScraperReturned, string>
}

function searchTemplate(url: string): Result<ScraperRegister, string> {
    let result = null
    for (let node of scraperRegister) {
        if (url.match(node.urlRegex)) {
            result = node
            break
        }
    }
    if (result == null) {
        return new Err("Error:Can't find matched scraper template for " + url)
    } else {
        return new Ok(result)
    }
}

let count = 0

function getBadge(): string {
    let res
    switch (count % 14) {
        case 0:
            res = chalk.bgRed("Worker " + count)
            break
        case 1:
            res = chalk.bgGreen("Worker " + count)
            break
        case 2:
            res = chalk.bgYellow("Worker " + count)
            break
        case 3:
            res = chalk.bgBlue("Worker " + count)
            break
        case 4:
            res = chalk.bgMagenta("Worker " + count)
            break
        case 5:
            res = chalk.bgCyan("Worker " + count)
            break
        case 6:
            res = chalk.bgWhite("Worker " + count)
            break
        case 7:
            res = chalk.bgGray("Worker " + count)
            break
        case 8:
            res = chalk.bgRedBright("Worker " + count)
            break
        case 9:
            res = chalk.bgGreenBright("Worker " + count)
            break
        case 10:
            res = chalk.bgYellowBright("Worker " + count)
            break
        case 11:
            res = chalk.bgBlueBright("Worker " + count)
            break
        case 12:
            res = chalk.bgMagentaBright("Worker " + count)
            break
        case 13:
            res = chalk.bgCyanBright("Worker " + count)
            break
        default:
            res = chalk.bgWhiteBright("Worker " + count)
            break
    }
    count++
    return res
}

//输入一个乱序tasks数组，按同域任务分类后使用线程池执行全部完成
export default async function (tasks: Array<TaskInstance>): Promise<Array<ResultNode>> {
    return new Promise(((resolve, reject) => {
        //按同域任务分类
        let classifyHash: any = {}, success = true
        for (let task of tasks) {
            let mRes = searchTemplate(task.pageUrl)
            if (mRes.err) {
                log(mRes.val)
                success = false
                break
            } else {
                let m = mRes.unwrap()
                if (classifyHash.hasOwnProperty(m.name)) {
                    (classifyHash[m.name].pool as Array<TaskInstance>).push(task)
                } else {
                    classifyHash[m.name] = {
                        entrance: m.entrance,
                        pool: [task]
                    }
                }
            }
        }
        if (!success) {
            reject("Error:Fatal error occurred when classifying tasks")
        }
        //分别spawn hash中得到的数个任务池
        //任务完成后会将结果追加到collection
        let collection: Array<ResultNode> = []
        for (let key in classifyHash) {
            let node = classifyHash[key]
            const taskParameter = {
                tasks: node.pool,
                entrance: node.entrance,
                badge: getBadge()
            }

            piscina.run(taskParameter).then((outcome: Array<Result<ScraperReturned, string>>) => {
                node.pool.forEach((poolNode: TaskInstance, index: number) => {
                    collection.push({
                        taskName: poolNode.name,
                        result: outcome[index]
                    })
                })
            })
        }
        //监听任务池事件
        piscina.on('drain', (_: any) => {
            resolve(collection)
        })
        piscina.on('error', (_: any) => {
            reject("Error:Fatal error occurred executing worker")
        })
    }))
}
