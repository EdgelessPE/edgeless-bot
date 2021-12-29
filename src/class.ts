//爬虫模板

enum ValidationType {
    "MD5",
    "CRC32",
    "SHA-1",
}

interface ScraperParameters {
    taskName: string;
    url: string;
    downloadLinkRegex?: string;
    versionMatchRegex?: string;
}

interface ScraperReturned {
    version: string;
    downloadLink: string;
    validation?: {
        type: ValidationType;
        value: string;
    };
}

interface ScraperRegister {
    name: string;
    urlRegex: string;
    entrance: string;
    requiredKeys: Array<string>;
}

//云盘下载模板
interface ResolverParameters {
    downloadLink: string;
    fileMatchRegex: string;
    cd?: Array<string>;
}

interface ResolverReturned {
    directLink: string;
}

interface ResolverRegister {
    name: string;
    downloadLinkRegex: string;
    entrance: string;
    requiredKeys: Array<string>;
}

//自动制作模板
interface ProducerParameters {
    taskName: string;
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
}

//数据库
interface BuildStatus {
    version: string;
    timestamp: string;
    fileName: string;
}

interface DatabaseNode {
    taskName: string;
    recent: {
        health: number; //健康度，0-3
        errorMessage: string;
        builds: Array<BuildStatus>;
    };
}

//任务实例
interface TaskInstance {
    name: string;
    author: string;
    category: string;
    pageUrl: string;
    options?: {
        requireWindows?: boolean;
        missingVersionTask?: boolean;
    };
    template: {
        scraper?: string;
        resolver?: string;
        producer: string;
    };
    downloadLinkRegex?: string;
    versionMatchRegex?: string;
    fileMatchRegex?: string;
    cd?: Array<string>;
    producerRequiredObject: any;
    buildManifest: Array<string>;
    compressLevel?: number;
    cover?: string; //允许使用压缩包或文件夹
}

//程序配置
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
    MAX_RETRY_PRODUCER: number;

    ARIA2_SPAWN: boolean;
    ARIA2_PORT: number;
    ARIA2_SECRET: string;
    ARIA2_PROXY: string;
    ARIA2_THREAD: number;

    SPECIFY_TASK: string;
    MODE_FORCED: boolean;
    GITHUB_ACTIONS: boolean;
}

//对象检验表节点
enum JsObjectType {
    "numberOrEnum",
    "string",
    "object",
    "boolean",
    "function",
    "invalid"
}

interface ObjectValidationNode {
    key: string;
    type: JsObjectType;
    required: boolean;
    properties?: Array<ObjectValidationNode>;
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
};
