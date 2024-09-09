// 爬虫模板

import { Result } from "ts-results";
import { NepPackage } from "./nep";

export type ValidationType = "MD5" | "SHA1" | "SHA256" | "BLAKE3";

export interface ScraperParameters {
  taskName: string;
  url: string;
  downloadLinkRegex?: string;
  versionMatchRegex?: string;
  scraper_temp?: unknown;
}

export interface ScraperReturned {
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

export interface ScraperRegister {
  name: string;
  urlRegex: string;
  entrance: string;
  requiredKeys: Array<string>;
  description?: string;
}

// 云盘下载模板
export interface ResolverParameters {
  downloadLink: string;
  fileMatchRegex: string;
  cd?: Array<string>;
  password?: string;
}

export interface ResolverReturned {
  directLink: string;
}

export interface ResolverRegister {
  name: string;
  downloadLinkRegex: string;
  entrance: string;
  // TODO:实现校验
  requiredKeys: Array<string>;
  // TODO:增加描述
  description?: string;
}

// 自动制作模板
export interface ProducerParameters {
  taskName: string;
  version: string;
  workshop: string;
  downloadedFile: string;
  requiredObject: unknown;
}

export interface ProducerReturned {
  readyRelativePath: string;
  mainProgram?: string;
  // nep flag
  flags?: string[];
  // 可拓展包的相关上下文
  expandableContext?: {
    downloadedFilePath?: string;
  };
}

export interface ProducerRegister {
  name: string;
  description: string;
  entrance: string;
  defaultCompressLevel: number;
  recommendedManifest?: string[];
}

// 数据库
export interface BuildStatus {
  version: string;
  timestamp: string;
  fileName: string;
}

export interface DatabaseNode {
  taskName: string;
  recent: {
    health: number; // 健康度，0-3
    latestVersion: string;
    errorMessage: string;
    builds: Array<BuildStatus>;
  };
}

// 任务实例
export interface TaskInstance {
  name: string;
  scope: string;
  description: string;
  language: string;
  tags?: string[];
  author: string[];
  license?: string;
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
    revised_version?: string | false;
    main_program?: string | false;
    registry_entry?: string;
    min_download_size?: string;
    // 可拓展包的上下文信息，给定下载文件的相对路径或禁用
    expandable?: string | false;
  };
  producer_required: unknown;
  scraper_temp?: unknown;
  extra?: {
    require_windows?: boolean;
    missing_version?: string;
    weekly?: boolean;
  };
  package_patch?: Partial<NepPackage>;
}

// 程序配置
export interface CONFIG {
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
export enum JsObjectType {
  "numberOrEnum",
  "string",
  "object",
  "boolean",
  "function",
  "invalid",
}

export interface ObjectValidationNode {
  key: string;
  type: JsObjectType;
  required: boolean;
  properties?: Array<ObjectValidationNode>;
}

// 工人数据对象
export interface WorkerDataScraper {
  badge: string;
  scriptPath: string;
  isExternal: boolean;
  tasks: Array<TaskInstance>;
}

export interface WorkerDataResolver {
  badge: string;
  scriptPath: string;
  url: string;
  fileMatchRegex: string;
  cd?: Array<string>;
  password?: string;
}

export interface WorkerDataProducer {
  badge: string;
  scriptPath: string;
  isExternal: boolean;
  task: ProducerParameters;
}

// 制作所需信息
export interface ExecuteParameter {
  task: TaskInstance;
  info: ScraperReturned;
}

// 状态报告
export interface ResultReport {
  taskName: string;
  result: Result<string[], string>; // 成功时返回新构建的名称，失败返回错误消息
}

export interface TaskConfig {
  task: {
    name: TaskInstance["name"];
    author: TaskInstance["author"];
    scope: TaskInstance["scope"];
    description: TaskInstance["description"];
    language: TaskInstance["language"];
    tags?: TaskInstance["tags"];
    category: TaskInstance["category"];
    url: TaskInstance["pageUrl"];
    license?: TaskInstance["license"];
  };
  template: TaskInstance["template"];
  regex: TaskInstance["regex"];
  parameter: TaskInstance["parameter"];
  producer_required: TaskInstance["producer_required"];
  extra?: TaskInstance["extra"];
}
