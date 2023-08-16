import path from "path";

const PATH_CONFIG = "./config.toml",
  LIGHT_TIMEOUT = 30000,
  HEAVY_TIMEOUT = 300000;
let MISSING_VERSION_TRY_DAY = 4;
const PROJECT_ROOT = process.cwd();
const DOWNLOAD_CACHE = path.join(PROJECT_ROOT, "cache");
const CATEGORIES = [
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
const ENV_JSON_PATH = "./env.json";

function setMVTDayToday() {
  MISSING_VERSION_TRY_DAY = new Date().getDay();
}

const VALID_WORKFLOW_NAMES = ["setup.toml", "update.toml", "remove.toml"];

export {
  PATH_CONFIG,
  LIGHT_TIMEOUT,
  HEAVY_TIMEOUT,
  PROJECT_ROOT,
  DOWNLOAD_CACHE,
  MISSING_VERSION_TRY_DAY,
  CATEGORIES,
  ENV_JSON_PATH,
  setMVTDayToday,
  VALID_WORKFLOW_NAMES,
};
