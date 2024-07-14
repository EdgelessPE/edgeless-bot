import fs from "fs";
import path from "path";
import { Err, Ok, Result } from "ts-results";
import {
  BuildStatus,
  ExecuteParameter,
  ResultReport,
  ScraperReturned,
  TaskInstance,
} from "./class";
import { config } from "./config";
import toml from "toml";
import {
  Cmp,
  formatVersion,
  log,
  matchVersion,
  parseBuiltInValue,
  requiredKeysValidator,
  schemaValidator,
  shuffle,
  versionCmp,
} from "./utils";
import { getDatabaseNode, setDatabaseNodeFailure } from "./database";
import { ResultNode } from "./scraper";
import resolver from "./resolver";
import { download } from "./aria2c";
import checksum from "./checksum";
import producerRegister from "../templates/producers/_register";
import producer from "./producer";
import { compress, release } from "./p7zip";
import { DOWNLOAD_CACHE, MISSING_VERSION_TRY_DAY, PROJECT_ROOT } from "./const";
import { deleteFromRemote } from "./cloud189";
import scraperRegister from "../templates/scrapers/_register";
import os from "os";
import { getOS } from "./platform";
import shell from "shelljs";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import rcInfo from "rcinfo";

export interface TaskConfig {
  task: {
    name: TaskInstance["name"];
    author: TaskInstance["author"];
    category: TaskInstance["category"];
    url: TaskInstance["pageUrl"];
  };
  template: TaskInstance["template"];
  regex: TaskInstance["regex"];
  parameter: TaskInstance["parameter"];
  producer_required: TaskInstance["producer_required"];
  extra?: TaskInstance["extra"];
}

async function getExeVersion(file: string, cd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(path.resolve(cd, file))) {
      reject(
        "Error:Can't find " +
          path.resolve(cd, file) +
          ' , please consider add "${taskName}/" before it',
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
          reject("Error:Can't get file version of " + path.resolve(cd, file));
        } else {
          resolve(info.FileVersion);
        }
      },
    );
  });
}

function validateConfig(task: TaskConfig): boolean {
  // 基础校验
  if (!schemaValidator(task, "task").unwrap()) {
    log(`Error:Schema validation failed`);
    return false;
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

function getSingleTask(taskName: string): Result<TaskInstance, string> {
  const taskConfigFile = path.resolve(
    process.cwd(),
    config.DIR_TASKS,
    taskName,
    "config.toml",
  );
  if (!fs.existsSync(path.resolve(taskConfigFile))) {
    return new Err("Error:Can't find config.toml for " + taskName);
  } else {
    const text = fs.readFileSync(taskConfigFile).toString();
    let json;
    try {
      json = toml.parse(text) as TaskConfig;
    } catch (e) {
      console.log(JSON.stringify(e));
      return new Err("Error:Can't parse config.toml for " + taskName);
    }
    if (taskName != json.task.name) {
      return new Err(
        `Error:Please keep the folder name (${taskName}) same with task name (${json.task.name})`,
      );
    }
    if (!validateConfig(json)) {
      return new Err("Error:Can't validate config.toml for " + taskName);
    } else {
      const res: any = json;
      res["name"] = json.task.name;
      res["author"] = json.task.author;
      res["category"] = json.task.category;
      res["pageUrl"] = json.task.url;
      return new Ok(res);
    }
  }
}

function getAllTasks(): Result<Array<TaskInstance>, string> {
  const tasksDir = path.resolve(process.cwd(), config.DIR_TASKS);
  if (!fs.existsSync(tasksDir)) {
    return new Err("Error:Task directory not exist : " + tasksDir);
  }
  const dirList = fs.readdirSync(tasksDir),
    result = [];
  let success = true,
    tmp;
  for (const taskName of dirList) {
    tmp = getSingleTask(taskName);
    if (tmp.err) {
      success = false;
      log(tmp.val);
    } else {
      const task = tmp.unwrap();
      if (!reserveTask(task)) {
        continue;
      }
      result.push(task);
    }
  }
  if (success) {
    return new Ok(result);
  } else {
    return new Err("Error:Fatal error occurred when reading tasks");
  }
}

function getTasksToBeExecuted(results: ResultNode[]): Array<{
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
      typeof newNode.version !== "string" ||
      typeof newNode.downloadLink !== "string"
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

// 返回压缩好的文件名，如果是无需制作的缺失版本号则会返回 missing_version
async function execute(t: ExecuteParameter): Promise<Result<string, string>> {
  const workshop = path.resolve(PROJECT_ROOT, config.DIR_WORKSHOP, t.task.name);
  let downloadedFile = "";
  let absolutePath = "";
  // 创建Cache目录
  if (config.ENABLE_CACHE && !fs.existsSync(DOWNLOAD_CACHE)) {
    await shell.mkdir("-p", DOWNLOAD_CACHE);
  }
  const subCacheDir = path.resolve(DOWNLOAD_CACHE, t.task.name);
  // 如果有则使用缓存
  if (config.ENABLE_CACHE && fs.existsSync(subCacheDir)) {
    log(`Warning:Use cache at ${subCacheDir}`);

    await shell.cp("-R", subCacheDir, workshop);
    absolutePath = shell.ls(path.resolve(workshop, "*.*"))[0] ?? "";
    downloadedFile = absolutePath.split("/").pop() as string;
  } else {
    if (config.ENABLE_CACHE) {
      log("Info:Cache not found");
    }
    // 解析直链
    const dRes = await resolver(
      {
        downloadLink: t.info.downloadLink,
        fileMatchRegex: parseBuiltInValue(
          t.task.regex.download_name,
          {
            taskName: t.task.name,
            downloadedFile: '"ERROR:Downloading not started yet"',
            latestVersion: t.info.version,
          },
          true,
        ),
        cd: t.task.parameter.resolver_cd ?? t.task.parameter.resolver_cd,
        password: t.info.resolverParameter?.password,
      },
      t.info.resolverParameter?.entrance ??
        t.task.template.resolver ??
        undefined,
    );
    if (dRes.err) {
      return dRes;
    }
    // 下载文件
    shell.mkdir(workshop);
    try {
      downloadedFile = await download(
        t.task.name,
        dRes.val.directLink,
        workshop,
        {
          referer: t.task.scraper_temp?.referer,
        },
      );
    } catch (e) {
      if (typeof e == "string") log(e);
      else {
        console.log(JSON.stringify(e));
      }
      return new Err("Error:Can't download link : " + dRes.val.directLink);
    }
    // 缓存下载
    if (config.ENABLE_CACHE) {
      log(`Info:Caching downloads into ${subCacheDir}`);
      await shell.cp("-R", workshop, subCacheDir);
    }
  }
  if (!absolutePath) {
    absolutePath = path.resolve(workshop, downloadedFile);
  }
  // 校验文件
  if (
    t.info.validation &&
    !(await checksum(
      absolutePath,
      t.info.validation.type,
      t.info.validation.value,
    ))
  ) {
    return new Err(
      `Error:Can't validate downloaded file,expect ${t.info.validation.value}`,
    );
  }
  // 制作
  const p = await producer({
    task: t.task,
    downloadedFile,
    version: t.info.version,
  });
  if (p.err) {
    log(p.val);
    return new Err(`Error:Can't produce task ${t.task.name}`);
  }
  // 获得即将验收的绝对路径
  const target = path.resolve(
    PROJECT_ROOT,
    config.DIR_WORKSHOP,
    t.task.name,
    p.val.readyRelativePath,
  );
  if (!config.GITHUB_ACTIONS) log("Info:Receive ready directory " + target);
  // 实现delete 与 cover
  let f, v;
  if (t.task.parameter.build_delete) {
    for (const file of t.task.parameter.build_delete) {
      v = parseBuiltInValue(file, {
        taskName: t.task.name,
        downloadedFile,
        latestVersion: t.info.version,
      });
      f = path.resolve(target, v);
      if (!fs.existsSync(f)) {
        // 尝试增加 ${taskName}/ 前缀
        f = path.resolve(target, t.task.name, v);
        if (!fs.existsSync(f)) {
          log(
            `Warning:Delete list include not existed file ${file}, consider update "build_delete"`,
          );
          continue;
        }
      }
      shell.rm("-rf", f);
    }
  }
  if (t.task.parameter.build_cover) {
    f = path.resolve(
      config.DIR_TASKS,
      t.task.name,
      t.task.parameter.build_cover,
    );
    if (!fs.existsSync(f)) {
      return new Err(`Error:Given cover not exist : ${f}`);
    } else {
      // 允许是文件夹或是压缩包
      if (fs.statSync(f).isDirectory()) {
        shell.cp("-r", f + "/*", target);
      } else {
        if (!(await release(f, target, false))) {
          return new Err("Error:Can't cover given compressed file");
        }
      }
    }
  } else {
    // 检查是否可能忘加了
    const p = path.resolve(config.DIR_TASKS, t.task.name, "cover");
    if (fs.existsSync(p) || fs.existsSync(p + ".7z")) {
      log(
        "Warning:Exist cover folder/file but parameter.build_cover not specified",
      );
    }
  }
  // 验收
  const getBuildManifest = (): Array<string> => {
    const origin = t.task.parameter.build_manifest,
      final: Array<string> = [];
    for (const cmd of origin) {
      final.push(
        parseBuiltInValue(cmd, {
          downloadedFile,
          taskName: t.task.name,
          latestVersion: t.info.version,
        }).replace("\\", "/"),
      );
    }
    return final;
  };
  let pass = true;
  for (const file of getBuildManifest()) {
    if (!fs.existsSync(path.resolve(target, file))) {
      pass = false;
      log(`Error:Check manifest failed for ${t.task.name},missing ${file}`);
    }
  }
  if (!pass) {
    return new Err(
      `Error:Can't produce task ${t.task.name} due to build missing`,
    );
  }
  // 处理无版本号任务：读取本地文件获得版本号
  if (t.task.extra?.missing_version) {
    let version;
    try {
      version = await getExeVersion(
        parseBuiltInValue(t.task.extra.missing_version, {
          taskName: t.task.name,
          downloadedFile,
          latestVersion: t.info.version,
        }),
        target,
      );
    } catch (e) {
      console.log(e);
      return new Err("Error:Fetch execute file version failed");
    }
    if (version == null) {
      return new Err("Error:Fetch execute file version failed : returned null");
    }
    t.info.version = version;
    // 如果版本号和数据库中一样说明没有更新
    let ctn = true;
    const db = getDatabaseNode(t.task.name);
    switch (versionCmp(version, db.recent.latestVersion)) {
      case Cmp.E:
        // 与数据库一致，没有更新
        log(
          `Info:Missing version task ${t.task.name} has no upstream updated release`,
        );
        if (config.MODE_FORCED) {
          log("Warning:Forced rebuild " + t.task.name);
        } else {
          // 阻止继续，直接返回成功
          ctn = false;
        }
        break;
      case Cmp.G:
        // 存在更新，继续
        break;
      case Cmp.L:
        // 异常情况，上游版本号低于数据库版本号
        log(
          `Warning:Missing version task ${t.task.name}'s local version(${db.recent.latestVersion}) greater than online version(${version})`,
        );
        if (config.MODE_FORCED) {
          log("Warning:Forced rebuild " + t.task.name);
        } else {
          ctn = false;
        }
        break;
    }
    if (!ctn) {
      return new Ok("missing_version");
    }
  }
  // 压缩
  const fileName = `${t.task.name}_${matchVersion(t.info.version).val}_${
    t.task.author
  }（bot）.7z`;
  if (
    !(await compress(
      p.val.readyRelativePath,
      fileName,
      t.task.parameter.compress_level ??
        getDefaultCompressLevel(t.task.template.producer),
      workshop,
    ))
  ) {
    return new Err("Error:Compress failed");
  }
  shell.mkdir(
    "-p",
    path.resolve(PROJECT_ROOT, config.DIR_BUILDS, t.task.category),
  );
  const storagePath = path.resolve(
    PROJECT_ROOT,
    config.DIR_BUILDS,
    t.task.category,
    fileName,
  );
  if (fs.existsSync(storagePath)) {
    shell.rm("-f", storagePath);
  }
  shell.mv(path.resolve(workshop, fileName), storagePath);
  if (
    !fs.existsSync(
      path.resolve(PROJECT_ROOT, config.DIR_BUILDS, t.task.category, fileName),
    )
  ) {
    return new Err("Error:Moving compressed file to builds folder failed");
  }
  return new Ok(fileName);
}

function getDefaultCompressLevel(templateName: string): number {
  let level = 5;
  for (const node of producerRegister) {
    if (node.entrance == templateName) {
      level = node.defaultCompressLevel;
      break;
    }
  }
  return level;
}

async function executeTasks(
  ts: Array<ExecuteParameter>,
): Promise<Array<ResultReport>> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    if (ts.length == 0) {
      log("Info:No tasks to be executed");
      resolve([]);
      return;
    }
    const total = ts.length;
    let r = "";
    const normalTasks: Array<ExecuteParameter> = [],
      requireWindowsTasks: Array<ExecuteParameter> = [];
    ts.forEach((item) => {
      // 生成tip
      r = r + ` ${item.task.name}`;
      // 根据是否需要Windows分流
      if (item.task.extra?.require_windows) {
        requireWindowsTasks.push(item);
      } else {
        normalTasks.push(item);
      }
    });
    log(`Info:Starting executing ${total} tasks :${r}`);
    let done = 0;
    const collection: Array<ResultReport> = [];
    const collect = (res: Result<string, string>, t: ExecuteParameter) => {
      // 处理缺失版本号但是无更新的情况
      if (res.ok && res.val == "missing_version") {
        log(
          `Success:Missing version task ${t.task.name} executed successfully`,
        );
      } else {
        // 处理正常情况
        if (res.err) {
          log(res.val);
          collection.push({
            taskName: t.task.name,
            result: res,
          });
        } else {
          log(`Success:Task ${t.task.name} executed successfully`);
          collection.push({
            taskName: t.task.name,
            result: res,
          });
        }
      }
      // 已完成任务自增，并检查是否需要resolve
      done++;
      if (done == total) {
        resolve(collection);
      }
    };
    // 并发全部的普通任务
    for (const t of shuffle(normalTasks)) {
      collect(await execute(t), t);
    }
    // 顺序执行全部的require windows任务
    if (os.platform() == "win32") {
      for (const t of shuffle(requireWindowsTasks)) {
        collect(await execute(t), t);
      }
    }
  });
}

function removeExtraBuilds(
  taskName: string,
  category: string,
  newBuild: string,
): Array<BuildStatus> {
  const allBuilds = getDatabaseNode(taskName).recent.builds;
  allBuilds.push({
    fileName: newBuild,
    version: newBuild.split("_")[1],
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
  const repo = path.resolve(PROJECT_ROOT, config.DIR_BUILDS, category);
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

      if (!deleteFromRemote(target.fileName, category)) {
        log("Warning:Fail to delete remote extra build " + target.fileName);
        failure.push(target);
      }
    }
  }
  buildList = buildList.concat(failure);

  return buildList;
}

function reserveTask(task: TaskInstance): boolean {
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

export {
  getAllTasks,
  getSingleTask,
  executeTasks,
  getTasksToBeExecuted,
  removeExtraBuilds,
  reserveTask,
};
