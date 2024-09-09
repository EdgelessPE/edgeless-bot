import path from "path";

export const PATH_CONFIG = "./config.toml",
  LIGHT_TIMEOUT = 30000,
  HEAVY_TIMEOUT = 300000;
export let MISSING_VERSION_TRY_DAY = 4;
export const PROJECT_ROOT = process.cwd();
export const DOWNLOAD_CACHE = path.join(PROJECT_ROOT, "cache");
export const DOWNLOAD_SERVE_CACHE = path.join(PROJECT_ROOT, "serve-cache");
export const CATEGORIES = [
  "实用工具",
  "开发辅助",
  "配置检测",
  "资源管理",
  "办公编辑",
  "输入法",
  "集成开发",
  "录屏看图",
  "媒体处理",
  "磁盘数据",
  "安全急救",
  "网课会议",
  "即时通讯",
  "安装备份",
  "游戏娱乐",
  "运行环境",
  "压缩镜像",
  "美化增强",
  "驱动管理",
  "下载上传",
  "浏览器",
  "影音播放",
  "远程连接",
];
export const ENV_JSON_PATH = "./env.json";

export function setMVTDayToday() {
  MISSING_VERSION_TRY_DAY = new Date().getDay();
}

export const VALID_WORKFLOW_NAMES = [
  "setup.toml",
  "update.toml",
  "remove.toml",
];

// 有效的 Nep flag
export const VALID_FLAGS = new Set([
  // 可拓展
  "E",
  // 调用安装包
  "I",
  // 便携版
  "P",
]);

export const MISSING_VERSION_FLAG = "_MISSING_VERSION_";
