/* eslint-disable no-throw-literal */
/* eslint-disable no-mixed-spaces-and-tabs */
import {Status} from './enum';
import {log} from './utils';

// 函数间通讯相关
interface NaiveInterface<T> {
    status: Status;
    payload: T;
}

class Interface<T = any> {
    status: Status;
    payload: T;

    unwrap(): any {
    	if (this.status === Status.ERROR) {
    		const text = (this.payload as unknown) as string;
    		const spl = text.split(':');
    		if (spl.length < 2) {
    			log('Warning:Caught illegal ERROR tip by unwarp()');
    			log('Error:' + text);
    			throw 'EXIT';
    		}

    		if (spl[0] !== 'Error') {
    			// Log("Warning:Expected ERROR tip,got " + spl[0] + " by unwarp()");
    			log('Error:' + text.substring(spl[0].length + 1));
    			throw 'EXIT';
    		}

    		throw text;
    	} else {
    		return this.payload;
    	}
    }

    constructor(config: NaiveInterface<T>) {
    	this.status = config.status;
    	this.payload = (config.payload as unknown) as T;
    }
}

interface PageInfo {
    text: string;
    href: string;
    md5: string;
}

// 任务配置信息
class Task {
    name: string; // 软件名（也作为任务名）
    category: string; // 软件分类
    author: string; // 打包者名称

    paUrl: string; // PortableApps网页链接
    releaseRequirement: Array<string>; // 解压下载的exe后工作目录中应该出现的文件/文件夹，用于包校验
    buildRequirement: Array<string>; // 构建成功时工作目录中应该出现的文件/文件夹，用于构建校验
    preprocess: boolean; // 是否启用PortableApps预处理
    autoMake: boolean; // 是否启用自动制作
    // useWget:boolean; //是否使用wget，默认使用aria2
	launchArgs: string | undefined;

    constructor() {
    	this.name = 'Null';
    	this.category = 'Null';
    	this.author = 'Null';
    	this.paUrl = 'Null';
    	this.releaseRequirement = ['Null'];
    	this.buildRequirement = ['Null'];
    	this.preprocess = true;
    	this.autoMake = true;
    	// This.useWget=false;
    }
}

// 数据库相关
interface BuildInfo {
    version: string;
    name: string;
}

interface BuildStatus {
    time: number;
    timeDescription: string;

    success: boolean;
    errorMessage: string;
}

class DatabaseNode {
    latestVersion: string;
    builds: Array<BuildInfo>;
    recentStatus: Array<BuildStatus>;

    constructor() {
    	this.latestVersion = '0.0.0';
    	this.builds = [];
    	this.recentStatus = [];
    }
}

export {
	NaiveInterface,
	Interface,
	PageInfo,
	Task,
	BuildInfo,
	BuildStatus,
	DatabaseNode,
};
