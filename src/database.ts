import fs from 'fs';
import {BuildStatus, DatabaseNode} from './class';
import {log} from './utils';
import {config} from './config';
import chalk from 'chalk';

let database: {
		[key: string]: {
			recent: DatabaseNode['recent']
		}
	} = {};
export let modified = false;

//记录执行成功/失败的操作列表
let successList: Array<{
	taskName: string,
	from: string,
	to: string
}> = [];
let failedList: Array<{
	taskName: string,
	errorMessage: string
}> = [];

//初始化时调用
function readDatabase() {
	if (!fs.existsSync(config.DATABASE_PATH)) {
		log('Warning:Database file not found,create new one');
		database = {};
		return;
	}
	let text = fs.readFileSync(config.DATABASE_PATH).toString();
	database = JSON.parse(text);
}

//保存数据库
function writeDatabase() {
	if (!config.DATABASE_UPDATE) {
		log('Warning:Database not updated' + (modified ? ', modification would be abandoned' : ''));
		return;
	}
	if (modified) {
		fs.writeFileSync(config.DATABASE_PATH, JSON.stringify(database, null, 2));
		log('Info:Database updated');
	}
}

//需要在read后调用
function getDatabaseNode(taskName: string): DatabaseNode {
	if (database.hasOwnProperty(taskName)) {
		let node = JSON.parse(JSON.stringify(database[taskName])) as DatabaseNode;
		node['taskName'] = taskName;
		return node;
	} else {
		return {
			taskName,
			recent: {
				health: 3,
				latestVersion: '0.0.0.0',
				errorMessage: 'No error yet',
				builds: [],
			},
		};
	}
}

//需要在read后调用
function setDatabaseNodeFailure(taskName: string, errorMessage: string) {
	log(errorMessage + ` for task ${taskName}`);
	let old = getDatabaseNode(taskName);
	database[taskName] = {
		recent: {
			health: (old.recent.health > 0) ? (old.recent.health - 1) : 0,
			latestVersion: old.recent.latestVersion,
			errorMessage,
			builds: old.recent.builds,
		},
	};
	failedList.push({
		taskName,
		errorMessage,
	});
	modified = true;
}

function setDatabaseNodeSuccess(taskName: string, newBuilds: Array<BuildStatus>) {
	let old = getDatabaseNode(taskName),
		newVersion = newBuilds[newBuilds.length - 1].version;
	database[taskName] = {
		recent: {
			health: (old.recent.health == 3) ? 3 : (old.recent.health + 1),
			latestVersion: newVersion,
			errorMessage: old.recent.errorMessage,
			builds: newBuilds,
		}
	};
	successList.push({
		taskName,
		from: old.recent.latestVersion,
		to: newVersion,
	});
	modified = true;
}

//输出日志

function generateSuccessTip(): string {
	let tip = '';
	for (let i of successList) {
		tip += `\n\t${chalk.cyan(i.taskName)} updated from ${i.from} to ${i.to}`;
	}
	return tip;
}

function generateFailureTip(): string {
	let tip = '';
	for (let i of failedList) {
		tip += `\n\t${chalk.yellowBright(i.taskName)} : ${i.errorMessage.replace('\n', '')}`;
	}
	return tip;
}

//返回是否存在失败
function report(): boolean {
	if (failedList.length == 0) {
		//全部成功
		log(`Success:Executed ${successList.length} tasks :${generateSuccessTip()}`);
	} else {
		//存在失败
		log(`Error:${failedList.length} tasks failed :${generateFailureTip()}`);
		//GA模式下向额外输出内容
		if (config.GITHUB_ACTIONS) {
			console.log(`::error:: ${failedList.length} tasks failed :${failedList.toString()}`);
		} else {
			console.log("GITHUB_ACTIONS:false")
		}
		if (successList.length > 0) {
			log(`Info:Successful tasks :${generateSuccessTip()}`);
		}
	}
	return failedList.length == 0;
}

export {
	readDatabase,
	writeDatabase,
	getDatabaseNode,
	setDatabaseNodeSuccess,
	setDatabaseNodeFailure,
	report,
};
