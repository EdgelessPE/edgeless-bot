import fs from "fs"
import UserConfig from "./config"
const args: any = require("minimist")(process.argv.slice(2))

export const _userConfig = new UserConfig(
    fs.readFileSync("./config.jsonc", "utf8")
);

// 远程开关
export const ENABLE_REMOTE = args.hasOwnProperty("d")?false:_userConfig.resolved.enableRemote;
// 忽略远程警告
export const IGNORE_REMOTE = args.hasOwnProperty("d")?false:_userConfig.resolved.ignoreRemote;

export const DIR_TASKS = _userConfig.resolved.dirTask;
export const DIR_WORKSHOP = _userConfig.resolved.dirWorkshop;
export const DIR_BUILDS = _userConfig.resolved.dirBuilds;
export const PATH_DATABASE = _userConfig.resolved.pathDatabase;
export const MAX_BUILDS = Math.max(_userConfig.resolved.maxBuildsNum,1);
export const REMOTE_NAME = _userConfig.resolved.remoteName;
export const REMOTE_ROOT = _userConfig.resolved.remoteRoot;