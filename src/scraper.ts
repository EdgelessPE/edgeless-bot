import path from "path";
import {ScraperRegister, ScraperReturned, TaskInstance, WorkerData} from "./class";
import {Err, Ok, Result} from "ts-results";
import scraperRegister from '../templates/scrapers/_register'
import {log} from "./utils";
import chalk from "chalk";
import fs from "fs";
import Piscina from 'piscina';
import {config} from "./config";

export interface ResultNode {
    taskName: string,
    result: Result<ScraperReturned, string>
}

function searchTemplate(url: string): Result<ScraperRegister, string> {
    //内部实现外置脚本模板
    if (url.match(/external:\/\//) != null) {
        return new Ok({
            name: "External",
            entrance: "External",
            urlRegex: "external://",
            requiredKeys: []
        })
    }
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

function parsePath(entrance: string): Result<string, string> {
    let p = path.join(__dirname, "..", "templates", "scrapers", entrance + ".js")
    if (fs.existsSync(p)) {
        return new Ok(p)
    } else {
        return new Err("Error:Can't find " + p)
    }
}
const base = Math.floor(Math.random() * 14)
let count = 0

function getBadge(): string {
    let res
    switch ((base + count) % 14) {
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
        let classifyHash: any = {}, success = true, workerSum = 0
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
                    workerSum++
                }
            }
        }
        if (!success) {
            reject("Error:Fatal error occurred when classifying tasks")
        } else {
            log(`Info:Need ${workerSum} workers to scrape`)
        }

        //分别spawn hash中得到的数个任务池
        let collection: Array<ResultNode> = []
        const piscina = new Piscina({
            filename: path.resolve(__dirname, 'worker.js')
        });
        piscina.on("error", (e) => {
            console.log(JSON.stringify(e))
            log("Error:Received error from worker")
        })
        let wd: WorkerData, p, jobSum = 0
        const checkResolve = function (badge: string, template: string) {
            log(`Info:${badge} finished tasks for ${template}`)
            if (piscina.completed == jobSum) {
                log(`Info:Workers all done`)
                resolve(collection)
            }
        }
        for (let key in classifyHash) {
            let node = classifyHash[key] as {
                entrance: string,
                pool: Array<TaskInstance>
            }
            if (node.entrance == "External") {
                //启动外置脚本任务
                let taskName = node.pool[0].name, badge = getBadge()
                wd = {
                    badge,
                    scriptPath: path.join(__dirname, "..", config.DIR_TASKS, taskName, "scraper.js"),
                    isExternal: true,
                    tasks: node.pool
                }
                piscina.run(wd)
                    .then((res: Result<Array<Result<ScraperReturned, string>>, string>) => {
                        if (res.err) {
                            node.pool.forEach((item) => {
                                collection.push({
                                    taskName: item.name,
                                    result: new Err(res.val)
                                })
                            })
                        } else {
                            node.pool.forEach((item, index) => {
                                collection.push({
                                    taskName: item.name,
                                    result: res.val[index]
                                })
                            })
                        }
                        checkResolve(badge, taskName)
                    })
                jobSum++
            } else {
                //启动模板任务
                p = parsePath(node.entrance)
                if (p.err) {
                    collection.push({
                        taskName: node.pool[0].name,
                        result: p
                    })
                    continue
                }
                let badge = getBadge()
                wd = {
                    badge,
                    scriptPath: p.unwrap(),
                    isExternal: false,
                    tasks: node.pool
                }
                piscina.run(wd)
                    .then((res: Result<Array<Result<ScraperReturned, string>>, string>) => {
                        if (res.err) {
                            node.pool.forEach((item) => {
                                collection.push({
                                    taskName: item.name,
                                    result: new Err(res.val)
                                })
                            })
                        } else {
                            node.pool.forEach((item, index) => {
                                collection.push({
                                    taskName: item.name,
                                    result: res.val[index]
                                })
                            })
                        }
                        checkResolve(badge, node.entrance)
                    })
                jobSum++
            }
        }
        //如果piscina未在运行中则直接返回
        if (jobSum == 0) {
            log("Warning:No jobs scheduled!")
            resolve(collection)
        } else {
            log(`Info:Scheduled ${jobSum} jobs`)
        }
    }))
}
