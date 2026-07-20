import os from "os";
import { Err, Ok, Result } from "ts-results";
import path from "path";
import fs from "fs";
import cp from "child_process";
import { config } from "./config";
import { log } from "./utils";
import { PROJECT_ROOT } from "./const";

type OS = "Windows" | "Linux" | "MacOS" | "Other";

function normalizeTaskPath(value: string): string {
  return value
    .replace(/^[\\/]+/, "")
    .split(/[\\/]+/)
    .join(path.sep);
}

export type Commands =
  | "p7zip"
  | "aria2c"
  | "rclone"
  | "pecmd"
  | "cloud189"
  | "cloud139"
  | "curl"
  | "innounp"
  | "innoextract"
  | "peversion";

function getOS(): OS {
  switch (os.platform()) {
    case "win32":
      return "Windows";
    case "linux":
      return "Linux";
    case "darwin":
      return "MacOS";
    default:
      return "Other";
  }
}

function getRequiredCommands(os: OS, remoteEnable: boolean): Commands[] {
  const commands: Commands[] = ["aria2c", "p7zip", "curl"];
  if (remoteEnable) {
    commands.push("cloud139");
  }
  if (os !== "Windows") {
    commands.push("innoextract");
  }
  if (os === "Linux") {
    commands.push("peversion");
  }
  return commands;
}

// 查找程序位置
function where(command: Commands): Result<string, string> {
  // 相对路径解析封装
  const parsePath = (p: string) => {
    if (p.indexOf("./") > -1) {
      return path.resolve(PROJECT_ROOT, p);
    } else {
      return p;
    }
  };
  // 生成可能的位置
  let possibleCommands: Array<string> = [];
  let possiblePositions: Array<string> = [];
  switch (command) {
    case "p7zip":
      possibleCommands = ["7z", "7zz", "7zzs", "p7zip", "7za"];
      possiblePositions = [
        "./7z",
        "./bin/7z",
        "./7zz",
        "./bin/7zz",
        "./7zzs",
        "./bin/7zzs",
        "C:/Program Files/7-Zip/7z",
        "C:/Program Files (x86)/7-Zip/7z",
        "C:/Program Files/7-Zip-Zstandard",
        `${process.env.PROGRAMFILESW6432}/7-Zip/7z`,
      ];
      break;
    case "aria2c":
      possibleCommands = ["aria2c"];
      possiblePositions = [
        "./aria2c",
        "./bin/aria2c",
        path.join(os.homedir(), "scoop/apps/aria2/current/aria2c"),
      ];
      break;
    case "rclone":
      possibleCommands = ["rclone"];
      possiblePositions = [
        "./rclone",
        "./bin/rclone",
        path.join(os.homedir(), "scoop/apps/rclone/current/rclone"),
      ];
      break;
    case "pecmd":
      possibleCommands = ["pecmd"];
      possiblePositions = ["./pecmd", "./bin/pecmd"];
      break;
    case "cloud189":
      possibleCommands = ["cloud189"];
      possiblePositions = ["./cloud189", "./bin/cloud189"];
      break;
    case "cloud139":
      possibleCommands = ["cloud139"];
      possiblePositions = ["./cloud139", "./bin/cloud139"];
      break;
    case "curl":
      possibleCommands = ["curl"];
      possiblePositions = ["./curl", "./bin/curl"];
      break;
    case "innounp":
      possibleCommands = ["innounp"];
      possiblePositions = [
        "./innounp",
        "./bin/innounp",
        path.join(os.homedir(), "scoop/apps/innounp/current/innounp"),
        path.join(os.homedir(), "scoop/apps/innounp-unicode/current/innounp"),
      ];
      break;
    case "innoextract":
      possibleCommands = ["innoextract"];
      possiblePositions = ["./innoextract", "./bin/innoextract"];
      break;
    case "peversion":
      possibleCommands = ["read-pe-version"];
      possiblePositions = ["./read-pe-version", "./bin/read-pe-version"];
      break;
    default:
      return new Err(`Error:Undefined command argument : ${command}`);
  }
  // 查找可能的命令
  let result = "";
  let node;
  const testCmd = getOS() == "Windows" ? "where" : "which";
  // 根据possibleCommands查找
  for (let i = 0; i < possibleCommands.length; i++) {
    node = possibleCommands[i];
    // 使用which/where
    try {
      cp.execFileSync(testCmd, [node], { stdio: "ignore" });
      result = node;
      break;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      /* empty */
    }
    // 生成可能的绝对路径
    let possibleAbsolutePaths = [
      node,
      path.join(process.cwd(), node),
      path.join(__dirname, node),
    ];
    if (getOS() == "Windows") {
      possibleAbsolutePaths = possibleAbsolutePaths.map((v) => `${v}.exe`);
    }
    possibleAbsolutePaths.forEach((item) => {
      if (fs.existsSync(item)) {
        result = item;
      }
    });
  }
  if (result != "") {
    return new Ok(parsePath(result));
  }
  // 根据possiblePositions查找
  if (possibleCommands.length === 1) {
    // 单个命令名，直接加 .exe
    // const cmd =
    //   getOS() == "Windows" ? `${possibleCommands[0]}.exe` : possibleCommands[0];
    for (let i = 0; i < possiblePositions.length; i++) {
      const fullPath =
        possiblePositions[i] +
        (getOS() == "Windows" && !possiblePositions[i].endsWith(".exe")
          ? ".exe"
          : "");
      if (fs.existsSync(fullPath)) {
        result = fullPath;
        break;
      }
    }
  } else {
    // 多个命令名，使用 join 组合
    for (let i = 0; i < possiblePositions.length; i++) {
      const basePath = possiblePositions[i];
      for (let j = 0; j < possibleCommands.length; j++) {
        let cmd = possibleCommands[j];
        if (getOS() == "Windows" && !cmd.endsWith(".exe")) {
          cmd += ".exe";
        }
        const fullPath = path.join(basePath, cmd);
        if (fs.existsSync(fullPath)) {
          result = fullPath;
          break;
        }
      }
      if (result != "") break;
    }
  }
  if (result != "") {
    return new Ok(parsePath(result));
  } else {
    return new Err(`Error:Can't find command : ${command}`);
  }
}

function ensurePlatform(alert = true): "Full" | "POSIX" | "Unavailable" {
  const os = getOS();
  const list = getRequiredCommands(os, config.REMOTE_ENABLE);
  let suc: "Full" | "POSIX" | "Unavailable" = "Full";
  for (const cmd of list) {
    if (where(cmd).err) {
      suc = "Unavailable";
      if (alert) log(`Error:Command ${cmd} not found`);
    }
  }
  if (suc == "Unavailable") return suc;

  // 如果是Windows检查pecmd
  if (os == "Windows") {
    if (where("pecmd").err) {
      suc = "POSIX";
      if (alert)
        log(
          `Warning:PECMD not found, use POSIX mode (tasks require Windows won't be executed)`,
        );
    }
  } else {
    suc = "POSIX";
    if (alert) {
      log(`Warning:Use POSIX mode, tasks require Windows won't be executed`);
    }
  }
  return suc;
}

export {
  getOS,
  where,
  OS,
  ensurePlatform,
  normalizeTaskPath,
  getRequiredCommands,
};
