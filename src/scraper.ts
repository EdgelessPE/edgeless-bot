import path from "path";
import {
  ScraperRegister,
  ScraperReturned,
  TaskInstance,
  WorkerDataScraper,
} from "./types/class";
import { Err, Ok, Result } from "ts-results";
import scraperRegister from "../templates/scrapers/_register";
import { log } from "./utils";
import fs from "fs";
import { config } from "./config";
import { piscina } from "./piscina";
import { getBadge } from "./badge";

export interface ResultNode {
  taskName: string;
  result: Result<ScraperReturned, string>;
}

function searchTemplate(
  url: string,
  scraperName?: string,
): Result<ScraperRegister, string> {
  //内部实现外置脚本模板
  if (scraperName && scraperName == "External") {
    return new Ok({
      name: "External",
      entrance: "External",
      urlRegex: "external://",
      requiredKeys: [],
    });
  }

  let result = null;

  if (scraperName) {
    //对钦定的模板直接赋值
    for (const node of scraperRegister) {
      if (scraperName == node.entrance) {
        result = node;
        break;
      }
    }
  } else {
    //匹配所有符合正则表达式的模板并选择匹配字符串长度最长的
    const results: {
      node: ScraperRegister;
      matchLength: number;
    }[] = [];

    for (const node of scraperRegister) {
      const m = url.match(node.urlRegex);
      if (m) {
        results.push({
          node,
          matchLength: m[0].length,
        });
      }
    }

    if (results.length > 0) {
      result = results.sort((a, b) => a.matchLength - b.matchLength).pop()!
        .node;
    }
  }

  if (result == null) {
    return new Err("Error:Can't find matched scraper template for " + url);
  } else {
    return new Ok(result);
  }
}

function parsePath(entrance: string): Result<string, string> {
  const p = path.join(
    __dirname,
    "..",
    "templates",
    "scrapers",
    entrance + ".js",
  );
  if (fs.existsSync(p)) {
    return new Ok(p);
  } else {
    return new Err("Error:Can't find " + p);
  }
}

//输入一个乱序tasks数组，按同域任务分类后使用线程池执行全部完成
export default async function (
  tasks: Array<TaskInstance>,
): Promise<Array<ResultNode>> {
  return new Promise((resolve, reject) => {
    //按同域任务分类
    const classifyHash: {
      [key: string]: {
        entrance: string;
        pool: Array<TaskInstance>;
      };
    } = {};
    let success = true,
      workerSum = 0;
    for (const task of tasks) {
      const mRes = searchTemplate(task.pageUrl, task.template.scraper);
      if (mRes.err) {
        log(mRes.val);
        success = false;
        break;
      } else {
        const m = mRes.unwrap();
        // log(`Info:Matched scraper template ${m.name} for task ${task.name}`);

        if (classifyHash[m.name] != null) {
          classifyHash[m.name].pool.push(task);
        } else {
          classifyHash[m.name] = {
            entrance: m.entrance,
            pool: [task],
          };
          workerSum++;
        }
      }
    }
    if (!success) {
      reject("Error:Fatal error occurred when classifying tasks");
      return;
    } else {
      log(`Info:Need ${workerSum} workers to scrape`);
    }

    //分别spawn hash中得到的数个任务池
    const collection: Array<ResultNode> = [];

    piscina.on("error", (e) => {
      console.log(JSON.stringify(e));
      log("Error:Received error from worker");
    });
    let wd: WorkerDataScraper,
      p,
      jobSum = 0;
    const checkResolve = function (badge: string, template: string) {
      log(`Success:Finished scraping for ${template}`, badge);
      if (piscina.completed == jobSum) {
        log(`Success:Scraping jobs all done`);
        resolve(collection);
      }
    };
    for (const key in classifyHash) {
      const node = classifyHash[key];
      if (node.entrance == "External") {
        //启动外置脚本任务
        for (const poolNode of node.pool) {
          const taskName = poolNode.name,
            badge = getBadge("Scraper");
          wd = {
            badge,
            scriptPath: path.join(
              __dirname,
              "..",
              config.DIR_TASKS,
              taskName,
              "scraper.js",
            ),
            isExternal: true,
            tasks: [poolNode],
          };
          piscina
            .run(wd, { name: "scraper" })
            .then(
              (res: Result<Array<Result<ScraperReturned, string>>, string>) => {
                if (res.err) {
                  log(
                    `Error:External scraper ${taskName} resolved error`,
                    badge,
                  );
                  collection.push({
                    taskName,
                    result: res,
                  });
                } else {
                  collection.push({
                    taskName,
                    result: res.val[0],
                  });
                }
                checkResolve(badge, taskName);
              },
            );
          jobSum++;
        }
      } else {
        //启动模板任务
        p = parsePath(node.entrance);
        if (p.err) {
          collection.push({
            taskName: node.pool[0].name,
            result: p,
          });
          continue;
        }
        const badge = getBadge("Scraper");
        wd = {
          badge,
          scriptPath: p.unwrap(),
          isExternal: false,
          tasks: node.pool,
        };
        piscina
          .run(wd, { name: "scraper" })
          .then(
            (res: Result<Array<Result<ScraperReturned, string>>, string>) => {
              if (res.err) {
                log(`Error:Scraper ${node.entrance} resolved error`, badge);
                node.pool.forEach((item) => {
                  collection.push({
                    taskName: item.name,
                    result: new Err(res.val),
                  });
                });
              } else {
                node.pool.forEach((item, index) => {
                  collection.push({
                    taskName: item.name,
                    result: res.val[index],
                  });
                });
              }
              checkResolve(badge, node.entrance);
            },
          );
        jobSum++;
      }
    }
    //如果piscina未在运行中则直接返回
    if (jobSum == 0) {
      log("Warning:No jobs scheduled!");
      resolve(collection);
    } else {
      log(`Info:Scheduled ${jobSum} jobs`);
    }
  });
}
