//爬虫模板

enum ValidationType {
	'MD5',
	'SHA1',
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
	defaultCompressLevel: number;
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
		latestVersion: string;
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
		build_manifest: Array<string>
		build_cover?: string;
		resolver_cd?: Array<string>;
		compress_level?: number;
	};
	producer_required: any;
	extra?: {
		require_windows?: boolean;
		missing_version?: string;
	};
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

	GLOBAL_PROXY: string;
	ARIA2_SPAWN: boolean;
	ARIA2_PORT: number;
	ARIA2_SECRET?: string;
	ARIA2_THREAD: number;

	SPECIFY_TASK: string;
	MODE_FORCED: boolean;
	GITHUB_ACTIONS: boolean;

}

//对象检验表节点
enum JsObjectType {
	'numberOrEnum',
	'string',
	'object',
	'boolean',
	'function',
	'invalid'
}

interface ObjectValidationNode {
	key: string;
	type: JsObjectType;
	required: boolean;
	properties?: Array<ObjectValidationNode>;
}

//工人数据对象
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
	cd?: Array<string>;
}

interface WorkerDataProducer {
	badge: string;
	scriptPath: string;
	isExternal: boolean;
	task: ProducerParameters;
}

//制作所需信息
interface ExecuteParameter {
	task: TaskInstance;
	info: ScraperReturned;
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
};
