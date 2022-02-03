import fs from 'fs';
import {BuildStatus, DatabaseNode} from './class';
import {log} from './utils';
import {config} from './config';

let database: {
		[key: string]: {
			recent: DatabaseNode['recent']
		}
	} = {},
	modified = false;

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
		let node = database[taskName] as DatabaseNode;
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
	let old = getDatabaseNode(taskName);
	database[taskName] = {
		recent: {
			health: (old.recent.health > 0) ? (old.recent.health--) : 0,
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
			health: (old.recent.health == 3) ? 3 : (old.recent.health++),
			latestVersion: newVersion,
			errorMessage: old.recent.errorMessage,
			builds: newBuilds,
		},
	};
	successList.push({
		taskName,
		from: old.recent.latestVersion,
		to: newVersion,
	});
	modified = true;
}

export {
	readDatabase,
	writeDatabase,
	getDatabaseNode,
	setDatabaseNodeSuccess,
	setDatabaseNodeFailure,
};
