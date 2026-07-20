// 爬虫模板

import { Result } from "ts-results";

type ValidationType = "MD5" | "SHA1" | "SHA256";

interface ScraperParameters {
  taskName: string;
  url: string;
  downloadLinkRegex?: string;
  versionMatchRegex?: string;
  scraper_temp?: any;
}

interface ScraperReturned {
  version: string;
  downloadLink: string;
  validation?: {
    type: ValidationType;
    value: string;
  };
  resolverParameter?: {
    entrance?: string; // 由scraper钦定resolver，会覆盖任务配置中的template.resolver
    password?: string;
    cd?: string[]; // 此cd会覆盖任务配置中的resolver_cd
  };
}

interface ScraperRegister {
  name: string;
  urlRegex: string;
  entrance: string;
  requiredKeys: Array<string>;
  description?: string;
}

// 云盘下载模板
interface ResolverParameters {
  downloadLink: string;
  fileMatchRegex: string;
  scraper_temp?: any;
  cd?: Array<string>;
  password?: string;
}

interface ResolverReturned {
  directLink: string;
}

interface ResolverRegister {
  name: string;
  downloadLinkRegex: string;
  entrance: string;
  // TODO:实现校验
  requiredKeys: Array<string>;
  // TODO:增加描述
  description?: string;
}

// 自动制作模板
interface ProducerParameters {
  taskName: string;
  version: string;
  category: string;
  author: string;
  workshop: string;
  downloadedFile: string;
  requiredObject: any;
}

interface ProducerReturned {
  readyRelativePath: string;
}

interface ProducerRegister {
  name: string;
  description: string;
  entrance: string;
  defaultCompressLevel: number;
  recommendedManifest?: string[];
}

// 数据库
interface BuildStatus {
  version: string;
  timestamp: string;
  fileName: string;
}

interface DatabaseNode {
  taskName: string;
  recent: {
    health: number; // 健康度，0-3
    latestVersion: string;
    errorMessage: string;
    builds: Array<BuildStatus>;
  };
}

// 任务实例
interface TaskInstance {
  name: string;
  author: string;
  category: string;
  pageUrl: string;
  template: {
    scraper?: string;
    resolver?: string;
    producer: string;
  };
  regex: {
    download_link?: string;
    download_name: string;
    scraper_version?: string;
  };
  parameter: {
    build_manifest: Array<string>;
    build_cover?: string;
    build_delete?: Array<string>;
    resolver_cd?: Array<string>;
    compress_level?: number;
  };
  producer_required: any;
  scraper_temp?: any;
  extra?: {
    require_windows?: boolean;
    missing_version?: string;
    weekly?: boolean;
  };
}

// 程序配置
interface CONFIG {
  DATABASE_UPDATE: boolean;
  DATABASE_PATH: string;

  REMOTE_ENABLE: boolean;
  REMOTE_NAME: string;
  REMOTE_PATH: string;

  DIR_TASKS: string;
  DIR_WORKSHOP: string;
  DIR_BUILDS: string;

  MAX_BUILDS: number;
  MAX_RETRY_SCRAPER: number;
  MAX_RETRY_RESOLVER: number;

  GLOBAL_PROXY: string;
  ARIA2_SPAWN: boolean;
  ARIA2_PORT: number;
  ARIA2_SECRET?: string;
  ARIA2_THREAD: number;

  SPECIFY_TASK: string;
  MODE_FORCED: boolean;
  GITHUB_ACTIONS: boolean;

  ENABLE_CACHE: boolean;
  DEBUG_MODE: boolean;
}

// 对象检验表节点
enum JsObjectType {
  "numberOrEnum",
  "string",
  "object",
  "boolean",
  "function",
  "invalid",
}

interface ObjectValidationNode {
  key: string;
  type: JsObjectType;
  required: boolean;
  properties?: Array<ObjectValidationNode>;
}

// 工人数据对象
interface WorkerDataScraper {
  badge: string;
  scriptPath: string;
  isExternal: boolean;
  tasks: Array<TaskInstance>;
}

interface WorkerDataResolver {
  badge: string;
  scriptPath: string;
  url: string;
  fileMatchRegex: string;
  scraper_temp?: any;
  cd?: Array<string>;
  password?: string;
}

interface WorkerDataProducer {
  badge: string;
  scriptPath: string;
  isExternal: boolean;
  task: ProducerParameters;
}

// 制作所需信息
interface ExecuteParameter {
  task: TaskInstance;
  info: ScraperReturned;
}

// 状态报告
interface ResultReport {
  taskName: string;
  result: Result<string, string>; // 成功时返回新构建的名称，失败返回错误消息
}

export {
  ValidationType,
  JsObjectType,
  ScraperParameters,
  ScraperReturned,
  ScraperRegister,
  ResolverParameters,
  ResolverReturned,
  ResolverRegister,
  ProducerParameters,
  ProducerReturned,
  ProducerRegister,
  DatabaseNode,
  TaskInstance,
  CONFIG,
  ObjectValidationNode,
  WorkerDataScraper,
  WorkerDataResolver,
  WorkerDataProducer,
  ExecuteParameter,
  BuildStatus,
  ResultReport,
};
