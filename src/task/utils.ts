import {
  BuildStatus,
  ScraperReturned,
  TaskConfig,
  TaskInstance,
} from "../types/class";
import { getDatabaseNode, setDatabaseNodeFailure } from "../utils/database";
import {
  Cmp,
  formatVersion,
  getVersionFromFileName,
  log,
  matchVersion,
  parseFileSize,
  requiredKeysValidator,
  schemaValidator,
  versionCmp,
} from "../utils";
import { config } from "../config";
import path from "path";
import { MISSING_VERSION_TRY_DAY, PROJECT_ROOT } from "../const";
import fs from "fs";
import shell from "shelljs";
import { deleteFromRemote } from "../cli/cloud189";
import { Err, Ok, Result } from "ts-results";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import rcInfo from "rcinfo";
import scraperRegister from "../../templates/scrapers/_register";
import producerRegister from "../../templates/producers/_register";
import { getOS } from "../utils/platform";
import { ResultNode } from "../steps/scraper";
import { getSingleTask } from "./getter";

export function removeExtraBuilds(
  taskName: string,
  scope: string,
  newBuild: string,
): Array<BuildStatus> {
  const allBuilds = getDatabaseNode(taskName).recent.builds;
  allBuilds.push({
    fileName: newBuild,
    version: getVersionFromFileName(newBuild),
    timestamp: new Date().toString(),
  });
  log("Info:Trying to remove extra builds");
  // Builds去重
  const hashMap: Record<string, boolean> = {};
  let buildList: Array<BuildStatus> = [];
  for (const build of allBuilds) {
    if (!hashMap[build.version]) {
      hashMap[build.version] = true;
      buildList.push(build);
    }
  }
  if (buildList.length <= config.MAX_BUILDS) {
    log("Info:No needy for removal after de-weight");
    return buildList;
  }

  // Builds降序排列（从列尾弹出元素删除）
  buildList.sort((a, b) => 1 - versionCmp(a.version, b.version));
  // 删除多余的builds
  const failure: Array<BuildStatus> = [];
  const repo = path.resolve(PROJECT_ROOT, config.DIR_BUILDS, scope, taskName);
  const times = buildList.length - config.MAX_BUILDS;
  for (let i = 0; i < times; i++) {
    const target = buildList.pop();
    if (typeof target != "undefined") {
      const absolutePath = path.resolve(repo, target.fileName);
      if (!config.GITHUB_ACTIONS && fs.existsSync(absolutePath)) {
        log("Info:Remove local extra build " + absolutePath);
        try {
          shell.rm(absolutePath);
          if (fs.existsSync(absolutePath)) {
            log("Warning:Fail to delete local extra build " + target.fileName);
          }
        } catch {
          log("Warning:Fail to delete local extra build " + target.fileName);
        }
      }

      if (!deleteFromRemote(target.fileName, scope, taskName)) {
        log("Warning:Fail to delete remote extra build " + target.fileName);
        failure.push(target);
      }
    }
  }
  buildList = buildList.concat(failure);

  return buildList;
}

export async function getExeVersion(
  file: string,
  cd: string,
): Promise<Result<string, string>> {
  return new Promise((resolve) => {
    if (!fs.existsSync(path.resolve(cd, file))) {
      resolve(
        new Err(
          "Error:Can't find " +
            path.resolve(cd, file) +
            ' , please consider add "${taskName}/" before it',
        ),
      );
    }
    rcInfo(
      path.resolve(cd, file),
      (
        error: unknown,
        info: {
          FileVersion: string;
        },
      ) => {
        if (error) {
          console.log(JSON.stringify(error, null, 2));
          resolve(
            new Err(
              "Error:Can't get file version of " + path.resolve(cd, file),
            ),
          );
        } else {
          if (info.FileVersion) resolve(new Ok(info.FileVersion));
          else {
            resolve(
              new Err(
                "Error:Fetch execute file version failed : returned null",
              ),
            );
          }
        }
      },
    );
  });
}

export function validateConfig(task: TaskConfig): boolean {
  // 基础校验
  if (!schemaValidator(task, "task").unwrap()) {
    log(`Error:Schema validation failed`);
    return false;
  }
  // 检查是否能解析 min_download_size
  if (task.parameter.min_download_size) {
    const res = parseFileSize(task.parameter.min_download_size);
    if (res.err) {
      log(`Error:Schema validation failed : ${res.val}`);
      return false;
    }
  }
  let suc = false;
  // 尝试匹配Scraper
  if (task.template.scraper == undefined) {
    for (const node of scraperRegister.reverse()) {
      if (task.task.url.match(node.urlRegex) != null) {
        // 对scraper执行requiredKeys检查
        suc = requiredKeysValidator(task, node.requiredKeys, true);
        if (!suc) {
          log(
            `Warning:Skip scraper template ${node.name} due to missing required keys`,
          );
        } else {
          break;
        }
      }
    }
    if (!suc) {
      log(`Error:Can't match scraper template for ${task.task.url}`);
      return false;
    }
  } else if (task.template.scraper != "External") {
    for (const node of scraperRegister) {
      if (node.entrance == task.template.scraper) {
        // 对scraper执行requiredKeys检查
        suc = requiredKeysValidator(task, node.requiredKeys);
        break;
      }
    }
    if (!suc) {
      log(`Error:requiredKeys for scraper not satisfied`);
      return false;
    }
  }
  // Producer模板配置正确性检查
  if (task.template.producer != "External") {
    suc = false;
    for (const node of producerRegister) {
      if (node.entrance == task.template.producer) {
        suc = true;
        break;
      }
    }
    if (!suc) {
      log(`Error:Producer template ${task.template.producer} not registered`);
      return false;
    }
    if (
      !fs.existsSync(
        path.resolve(
          "./schema",
          "producer_templates",
          task.template.producer + ".json",
        ),
      )
    ) {
      log(
        `Error:Producer template schema file ${task.template.producer} not found`,
      );
      return false;
    }
    // producer_required检查
    suc = schemaValidator(
      task.producer_required,
      "producer_templates/" + task.template.producer,
      "/producer_required",
    ).unwrap();
  }
  if (
    task.template.producer == "External" &&
    task.template.scraper == "External"
  ) {
    return true;
  }
  return suc;
}

export function reserveTask(task: TaskInstance): boolean {
  // 排除 weekly
  if (task.extra?.weekly && MISSING_VERSION_TRY_DAY != new Date().getDay()) {
    log(`Warning:Ignore weekly task ${task.name}`);
    return false;
  }
  const isPOSIX = getOS() !== "Windows";
  // 排除需要 Windows
  if (isPOSIX && task.extra?.require_windows) {
    log(`Warning:Ignore require Windows task ${task.name}`);
    return false;
  }

  // 排除 POSIX 平台但是需要读取版本号
  if (isPOSIX && task.extra?.missing_version) {
    log(`Warning:Ignore missing version task ${task.name} in POSIX platform`);
    return false;
  }

  return true;
}

export function getTasksToBeExecuted(results: ResultNode[]): Array<{
  task: TaskInstance;
  info: ScraperReturned;
}> {
  // 逐个判断是否需要执行制作
  const makeList: Array<{
    task: TaskInstance;
    info: ScraperReturned;
  }> = [];
  let db, newNode: ScraperReturned, matchRes, res, onlineVersion;
  for (const result of results) {
    if (result == null) {
      continue;
    }
    // 处理爬虫出错
    if (result.result == null || result.result.err) {
      setDatabaseNodeFailure(
        result.taskName,
        result.result?.val ?? "Error:Scraper returned null",
      );
      continue;
    }
    newNode = result.result.val;
    if (newNode.version == null || newNode.downloadLink == null) {
      setDatabaseNodeFailure(
        result.taskName,
        `Error:Scraper returned null value : ${JSON.stringify(newNode)}`,
      );
      continue;
    }
    if (
      typeof (newNode.version as unknown) !== "string" ||
      typeof (newNode.downloadLink as unknown) !== "string"
    ) {
      setDatabaseNodeFailure(
        result.taskName,
        `Error:Scraper returned value doesn't conform to type specification : ${JSON.stringify(
          newNode,
        )}`,
      );
      continue;
    }
    // 进行版本号比较
    matchRes = matchVersion(newNode.version);
    if (matchRes.err) {
      setDatabaseNodeFailure(
        result.taskName,
        "Error:Can't parse version returned by scraper : " + newNode.version,
      );
      continue;
    }
    onlineVersion = formatVersion(matchRes.val).unwrap();
    newNode.version = onlineVersion;
    res = getSingleTask(result.taskName);
    db = getDatabaseNode(result.taskName);
    switch (versionCmp(db.recent.latestVersion, onlineVersion)) {
      case Cmp.L:
        // 需要更新
        if (res.err) {
          log(res.val);
          break;
        }
        makeList.push({
          task: res.val,
          info: newNode,
        });
        break;
      case Cmp.G:
        // 警告
        if (onlineVersion != "0.0.0.0") {
          log(
            `Warning:Local version(${db.recent.latestVersion}) greater than online version(${onlineVersion})`,
          );
        } else {
          log(`Info:Ignore missing version task ` + result.taskName);
        }
        if (res.err) {
          log(res.val);
          break;
        }
        if (config.MODE_FORCED) {
          log("Warning:Forced rebuild " + result.taskName);
          makeList.push({
            task: res.val,
            info: newNode,
          });
        }
        break;
      default:
        if (res.err) {
          log(res.val);
          break;
        }
        if (config.MODE_FORCED) {
          log("Warning:Forced rebuild " + result.taskName);
          makeList.push({
            task: res.val,
            info: newNode,
          });
        }
        break;
    }
  }
  return makeList;
}
