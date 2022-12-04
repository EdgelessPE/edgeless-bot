import os from "os";
import { Err, Ok, Result } from "ts-results";
import path from "path";
import fs from "fs";
import cp from "child_process";
import { config } from "./config";
import { log } from "./utils";
import { PROJECT_ROOT } from "./const";

type OS = "Windows" | "Linux" | "MacOS" | "Other";

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

//查找程序位置，返回值为绝对路径时会包含双引号
function where(command: string): Result<string, string> {
  //相对路径解析封装
  const parsePath = (p: string) => {
    if (p.indexOf("./") > -1) {
      return path.resolve(PROJECT_ROOT, p);
    } else {
      return p;
    }
  };
  //生成可能的位置
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
        process.env.PROGRAMFILESW6432 + "/7-Zip/7z",
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
    default:
      return new Err(`Error:Undefined command argument : ${command}`);
  }
  //查找可能的命令
  let result = "";
  let node;
  const testCmd = getOS() == "Windows" ? "where" : "which";
  //根据possibleCommands查找
  for (let i = 0; i < possibleCommands.length; i++) {
    node = possibleCommands[i];
    //使用which/where
    try {
      cp.execSync(`${testCmd} ${node}`, { stdio: "ignore" });
      result = node;
      break;
    } catch (e) {
      /* empty */
    }
    //生成可能的绝对路径
    let possibleAbsolutePaths = [
      node,
      path.join(process.cwd(), node),
      path.join(__dirname, node),
    ];
    if (getOS() == "Windows") {
      possibleAbsolutePaths = possibleAbsolutePaths.map((v) => v + ".exe");
    }
    possibleAbsolutePaths.forEach((item) => {
      if (fs.existsSync(item)) {
        result = '"' + item + '"';
      }
    });
  }
  if (result != "") {
    return new Ok(parsePath(result));
  }
  //根据possiblePositions查找
  for (let i = 0; i < possiblePositions.length; i++) {
    node = possiblePositions[i];
    if (getOS() == "Windows") {
      node += ".exe";
    }
    if (fs.existsSync(node)) {
      result = '"' + node + '"';
      break;
    }
  }
  if (result != "") {
    return new Ok(parsePath(result));
  } else {
    return new Err(`Error:Can't find command : ${command}`);
  }
}

function ensurePlatform(alert = true): "Full" | "POSIX" | "Unavailable" {
  const list = ["aria2c", "p7zip"];
  let suc: "Full" | "POSIX" | "Unavailable" = "Full";
  if (config.REMOTE_ENABLE) {
    list.push("rclone");
  }
  for (const cmd of list) {
    if (where(cmd).err) {
      suc = "Unavailable";
      if (alert) log(`Error:Command ${cmd} not found`);
    }
  }
  if (suc == "Unavailable") return suc;

  const os = getOS();

  //如果是Windows检查pecmd
  if (os == "Windows") {
    if (where("pecmd").err) {
      suc = "POSIX";
      if (alert)
        log(
          `Warning:PECMD not found, use POSIX mode (tasks require Windows won't be executed)`
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

export { getOS, where, OS, ensurePlatform };
