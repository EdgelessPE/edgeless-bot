import UserConfig from "./config"
import fs from "fs"

export const _userConfig = new UserConfig(
    fs.readFileSync("./config.jsonc", "utf8")
);

// 远程开关
export const ENABLE_REMOTE = _userConfig.resolved.enableRemote;
// 忽略远程警告
export const IGNORE_REMOTE = _userConfig.resolved.ignoreRemote;

export const DIR_TASKS = _userConfig.resolved.dirTask;
export const DIR_WORKSHOP = _userConfig.resolved.dirWorkshop;
export const DIR_BUILDS = _userConfig.resolved.dirBuilds;
export const PATH_DATABASE = _userConfig.resolved.pathDatabase;
export const MAX_BUILDS = _userConfig.resolved.maxBuildsNum;
export const REMOTE_NAME = _userConfig.resolved.remoteName;
export const REMOTE_ROOT = _userConfig.resolved.remoteRoot;