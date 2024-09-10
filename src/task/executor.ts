// 返回压缩好的文件名，如果是无需制作的缺失版本号则会返回 MISSING_VERSION_FLAG
import { ExecuteParameter } from "../types/class";
import { Err, Ok, Result } from "ts-results";
import {
  DOWNLOAD_CACHE,
  DOWNLOAD_SERVE_CACHE,
  MISSING_VERSION_FLAG,
  PROJECT_ROOT,
  VALID_FLAGS,
  VALID_WORKFLOW_NAMES,
} from "../const";
import path from "path";
import { config } from "../config";
import resolver from "../steps/resolver";
import {
  calcMD5,
  Cmp,
  log,
  parseBuiltInValue,
  parseBuiltInValueForObject,
  parseFileSize,
  tomlStringify,
  versionCmp,
} from "../utils";
import fs from "fs";
import shell from "shelljs";
import { download } from "../cli/aria2c";
import checksum from "../utils/checksum";
import { getExeVersion } from "./utils";
import producer from "../steps/producer";
import { release } from "../cli/p7zip";
import { getDatabaseNode } from "../utils/database";
import { NepPackage } from "../types/nep";
import { packer } from "./steps/packer";
import { produceExpandableReady } from "./steps/expandable";

export async function execute(
  t: ExecuteParameter,
): Promise<Result<string[] | typeof MISSING_VERSION_FLAG, string>> {
  const workshop = path.resolve(PROJECT_ROOT, config.DIR_WORKSHOP, t.task.name);
  let downloadedFile = "";
  let absolutePath = "";
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
    t.info.resolverParameter?.entrance ?? t.task.template.resolver ?? undefined,
  );
  if (dRes.err) {
    return dRes;
  }
  // 创建 Cache 目录
  const downloadCache = config.DEBUG_MODE
    ? DOWNLOAD_CACHE
    : DOWNLOAD_SERVE_CACHE;
  const hash = calcMD5(dRes.val.directLink);
  if (config.ENABLE_CACHE && !fs.existsSync(downloadCache)) {
    shell.mkdir("-p", downloadCache);
  }
  const subCacheDir = path.resolve(downloadCache, hash);
  // 如果有则使用缓存
  if (config.ENABLE_CACHE && fs.existsSync(subCacheDir)) {
    log(`Warning:Use cache at ${subCacheDir}`);

    shell.cp("-R", subCacheDir, workshop);
    absolutePath = shell.ls(path.resolve(workshop, "*.*"))[0] ?? "";
    downloadedFile = absolutePath.split("/").pop() as string;
  } else {
    if (config.ENABLE_CACHE) {
      log("Info:Cache not found");
    }
    // 下载文件
    shell.mkdir(workshop);
    try {
      downloadedFile = await download(
        t.task.name,
        dRes.val.directLink,
        workshop,
        {
          referer: (t.task.scraper_temp as any)?.referer,
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
      shell.cp("-R", workshop, subCacheDir);
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
      `Error:Can't validate downloaded file ${downloadedFile} : expect hash ${t.info.validation.value}`,
    );
  }
  // 文件应不小于给定的阈值（缺省512KB）
  const minSize = parseFileSize(t.task.parameter.min_download_size).unwrap();
  if (fs.statSync(absolutePath).size < minSize) {
    return new Err(
      `Error:Can't validate downloaded file ${downloadedFile} : file size less than ${
        t.task.parameter.min_download_size ?? "512KB"
      }`,
    );
  }
  // 对提供了 revised_version 的任务，尝试读取主程序版本号
  let revisedVersion = t.info.version;
  if (t.task.parameter.revised_version) {
    const parsed = parseBuiltInValue(t.task.parameter.revised_version, {
      taskName: t.task.name,
      downloadedFile,
      latestVersion: t.info.version,
    });
    const readRes = await getExeVersion(parsed, workshop);
    if (readRes.ok) {
      revisedVersion = readRes.unwrap();
      // t.info.version=revisedVersion;
      log(`Info:Get revised version '${revisedVersion}' due to '${parsed}'`);
    } else {
      log(
        `Warning:Failed to get version of main program before produce, inner value 'revisedVersion' won't be updated : ${readRes.val}`,
      );
    }
  }

  // 制作
  const p = await producer({
    task: t.task,
    downloadedFile,
    version: t.info.version,
    revisedVersion,
  });
  if (p.err) {
    log(p.val);
    return new Err(`Error:Can't produce task ${t.task.name}`);
  }
  // 检查返回的 flag 是否合规
  if (p.val.flags) {
    for (const flag of p.val.flags) {
      if (!VALID_FLAGS.has(flag)) {
        return new Err(
          `Error:Invalid flag '${flag}' returned by template at task ${t.task}`,
        );
      }
    }
  }
  // 获得即将验收的绝对路径
  const cleanTaskName = t.task.name.includes("_")
    ? t.task.name.split("_")[0]
    : t.task.name;
  const parsedBuiltInValuePack = {
    taskName: cleanTaskName,
    downloadedFile,
    latestVersion: t.info.version,
    revisedVersion,
  };
  const target = path.resolve(
    PROJECT_ROOT,
    config.DIR_WORKSHOP,
    t.task.name,
    p.val.readyRelativePath,
  );
  if (!config.GITHUB_ACTIONS) log("Info:Receive ready directory " + target);
  // 实现 delete 与 cover
  let f: string, v;
  if (t.task.parameter.build_delete) {
    for (const file of t.task.parameter.build_delete) {
      v = parseBuiltInValue(file, parsedBuiltInValuePack);
      f = path.resolve(target, v);
      if (!fs.existsSync(f)) {
        // 尝试增加 ${taskName}/ 前缀
        f = path.resolve(target, cleanTaskName, v);
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
        // 检查是否在 cover 和就绪目录中都有工作流文件
        const hasCoverNames = VALID_WORKFLOW_NAMES.filter(
          (name) =>
            fs.existsSync(path.resolve(f, "workflows", name)) &&
            fs.existsSync(path.resolve(target, "workflows", name)),
        );
        // 如果是，则先保存 bot 生成的工作流
        const botWorkflowScene: Record<string, string> = {};
        if (hasCoverNames.length) {
          for (const name of hasCoverNames) {
            const rawPath = path.resolve(target, "workflows", name);
            if (fs.existsSync(rawPath))
              botWorkflowScene[name] = fs.readFileSync(rawPath).toString();
          }
        }
        // 覆盖拷贝文件
        shell.cp("-r", f + "/*", target);
        // 替换插入原工作流标记，并替换内置变量
        if (hasCoverNames.length) {
          for (const name of hasCoverNames) {
            const rawPath = path.resolve(target, "workflows", name);
            const text = fs.readFileSync(rawPath).toString();
            const insertedText = text.replace(
              "#workflow:insert_origin",
              botWorkflowScene[name] ?? "",
            );
            const parsedText = parseBuiltInValue(
              insertedText,
              parsedBuiltInValuePack,
            );
            fs.writeFileSync(rawPath, parsedText);
          }
        }
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
        parseBuiltInValue(cmd, parsedBuiltInValuePack).replace("\\", "/"),
      );
    }
    return final;
  };
  let pass = true;
  for (const file of getBuildManifest()) {
    if (!fs.existsSync(path.resolve(target, file))) {
      pass = false;
      log(`Error:Check manifest failed for ${t.task.name} : missing ${file}`);
    }
  }
  if (!pass) {
    return new Err(
      `Error:Can't produce task ${t.task.name} due to build missing`,
    );
  }
  // 处理无版本号任务：读取本地文件获得版本号
  if (t.task.extra?.missing_version) {
    const versionRes = await getExeVersion(
      parseBuiltInValue(t.task.extra.missing_version, parsedBuiltInValuePack),
      target,
    );
    if (versionRes.err) return versionRes;
    const version = versionRes.unwrap();
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
      return new Ok(MISSING_VERSION_FLAG);
    }
  }
  // 写 package.toml
  const getMainProgram = (): string | undefined => {
    // 内置变量解释闭包
    const interpreter = (raw: string | undefined) => {
      if (raw) return parseBuiltInValue(raw, parsedBuiltInValuePack);
      else return undefined;
    };
    if (t.task.parameter.main_program === false) {
      return undefined;
    }
    if (t.task.parameter.main_program) {
      return interpreter(t.task.parameter.main_program);
    }
    return interpreter(p.val.mainProgram);
  };
  const nepPackage: NepPackage = {
    nep: "0.2",
    package: {
      name: cleanTaskName,
      template: "Software",
      description: t.task.description,
      version: t.info.version,
      authors: ["Bot <bot@edgeless.top>"].concat(t.task.author),
      license: t.task.license,
    },
    software: {
      scope: t.task.scope,
      upstream: t.task.pageUrl,
      category: t.task.category,
      language: t.task.language,
      main_program: getMainProgram(),
      registry_entry: t.task.parameter.registry_entry,
      tags: t.task.tags,
    },
  };

  // 打来自用户的 package_patch 补丁
  const { package_patch } = t.task;
  if (package_patch) {
    const parsedPackagePatch = parseBuiltInValueForObject(
      package_patch,
      parsedBuiltInValuePack,
    );
    for (const _key in nepPackage) {
      const key = _key as keyof NepPackage;
      if (parsedPackagePatch[key]) {
        Object.assign(nepPackage[key], parsedPackagePatch[key]);
      }
    }
  }

  fs.writeFileSync(
    path.resolve(target, "package.toml"),
    tomlStringify(nepPackage),
  );

  // 对就绪目录初步打包
  const packerRes = await packer(t, p, { target, workshop, cleanTaskName });
  if (packerRes.err) return packerRes;
  const fileNames = [packerRes.val];

  // 生成可展开包的就绪目录
  const expandReadyRes = await produceExpandableReady(t, p.val, {
    target,
    workshop,
  });
  if (expandReadyRes.err) return expandReadyRes;
  if (expandReadyRes.val === null) {
    log(`Info:Can't produce expandable package for task '${t.task.name}'`);
    return new Ok(fileNames);
  }
  log(`Info:Producing expandable package for task '${t.task.name}'`);

  // 打包可展开包
  const packerExpandableRes = await packer(t, p, {
    target: expandReadyRes.val,
    workshop,
    cleanTaskName,
    isExpandableAppend: true,
  });
  if (packerExpandableRes.err) return packerExpandableRes;
  fileNames.push(packerExpandableRes.val);

  return new Ok(fileNames);
}
