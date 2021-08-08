/* eslint-disable no-negated-condition */
/* eslint-disable no-await-in-loop */
/* eslint-disable eqeqeq */
/* eslint-disable guard-for-in */
/* eslint-disable no-throw-literal */
/* eslint-disable camelcase */
/* eslint-disable complexity */
/* eslint-disable no-eq-null */
/* eslint-disable no-prototype-builtins */
import minimist from 'minimist';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import {Status} from './enum';
import {cleanBuildStatus, log} from './utils';
import {DatabaseNode, Task} from './class';
import {readDatabase, saveDatabase} from './database';
import {beforeRunCheck, cleanWorkshop, find7zip} from './init';
import {aria2, getTasks, processTask, readTaskConfig, spawnAria2} from './task';
import {DIR_TASKS} from './const';
import {barometer} from './barometer';

export const args = minimist(process.argv.slice(2));

// Main
async function main() {
	console.clear();
	const failureTasks: Array<string> = [];
	if (fs.existsSync('./actions_failed')) {
		fs.unlinkSync('./actions_failed');
	}

	// 获取版本号
	let project_ver = '0.0.0';
	if (fs.existsSync(path.resolve(__dirname, '..', 'package.json'))) {
		project_ver = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json')).toString()).version;
	}

	console.log(
		chalk.cyan.bold('Edgeless Bot ver.' + project_ver),
	);

	// 提醒debug模式
	if (args.hasOwnProperty('d')) {
		log('Warning:Running at debug mode, remote operations and database update will be disabled');
	} 

	// 初始化
	if (args.hasOwnProperty('g')) {
		console.log('::group::Init');
	}

	log('Info:Launching,please hold a second...');
	if (!beforeRunCheck(args.hasOwnProperty('g'))) {
		throw 'Initialization failed';
	}

	if (!cleanWorkshop()) {
		throw 'Cleaning workshop failed';
	}

	if (!(await spawnAria2())) {
		throw 'Spawn Aria2 failed';
	}

	const p7zip = find7zip().unwrap();

	// 读入数据库
	const DB = readDatabase();
	// Log("Info:Get database as follow:")
	// console.log(JSON.stringify(DB))

	// 校验数据库
	const null_db_node = new DatabaseNode();
	for (const dbKey in DB) {
		const node = DB[dbKey] as DatabaseNode;
		for (const nodeKey in null_db_node) {
			if (!node.hasOwnProperty(nodeKey)) {
				log('Error:Database check failure,' + dbKey + '\'s key ' + nodeKey + ' not defined');
				throw 'Database check failure';
			}
		}
	}

	if (args.hasOwnProperty('g')) {
		console.log('::endgroup::');
	}

	// 根据命令行参数判断任务
	if (args.hasOwnProperty('t')) {
		// 只执行单一任务
		const taskName: string = args.t;

		// 校验任务文件夹是否存在
		if (taskName == null || taskName == '' || !fs.existsSync(DIR_TASKS + '/' + taskName)) {
			throw 'Error:Task ' + taskName + ' not exist';
		} else {
			log('Info:Argument t caught,run task ' + taskName);

			// 读取task配置
			const iRT = readTaskConfig(taskName);
			if (iRT.status === Status.ERROR) {
				log('Error:Can\'t read ' + taskName + '\'s config,exit');

				// 读取数据库中对应节点
				let dbNode = DB[taskName] as DatabaseNode;
				if (!dbNode) {
					dbNode = new DatabaseNode();
				}

				// 写数据库构建情况
				dbNode.recentStatus.push({
					time: Date.now(),
					timeDescription: Date(),

					success: false,
					errorMessage: 'Error:Can\'t read ' + taskName + '\'s config:' + iRT.payload,
				});
				DB[taskName] = dbNode;
				return;
			}

			const taskConfig = iRT.payload as Task;

			// 读取数据库中对应节点
			let dbNode = DB[taskName] as DatabaseNode;
			if (!dbNode) {
				dbNode = new DatabaseNode();
			}

			// 清理过多的构建状态信息
			if (dbNode.recentStatus.length > 2) {
				dbNode.recentStatus = cleanBuildStatus(dbNode.recentStatus);
			}

			// 执行task
			const iPT = await processTask(taskConfig, dbNode, p7zip);
			if (iPT.status === Status.ERROR) {
				// 打印错误
				log(iPT.payload);

				// 写数据库构建情况
				dbNode.recentStatus.push({
					time: Date.now(),
					timeDescription: Date(),

					success: false,
					errorMessage: iPT.payload,
				});
				DB[taskName] = dbNode;
			} else {
				// Task运行成功
				log('Success:Task ' + taskName + ' executed successfully');
				// 写入数据库
				const node = iPT.payload as DatabaseNode;
				node.recentStatus.push({
					time: Date.now(),
					timeDescription: Date(),

					success: true,
					errorMessage: 'Success',
				});
				DB[taskName] = node;
			}
		}
	} else {
		// 执行全部Tasks

		// 读入Tasks
		const tasks: Array<string> = getTasks();
		log('Info:Got ' + tasks.length + ' tasks in queue');

		// 顺次执行Tasks
		for (let i = 0; i < tasks.length; i++) {
			console.log('\nProgress:' + (i + 1) + '/' + tasks.length);

			const taskName = tasks[i];

			// 为GA输出分组
			if (args.hasOwnProperty('g')) {
				console.log('::group::' + taskName);
			}

			// 读取task配置
			const iRT = readTaskConfig(taskName);
			if (iRT.status === Status.ERROR) {
				log('Error:Can\'t read ' + taskName + '\'s config,skipping...');

				// 读取数据库中对应节点
				let dbNode = DB[taskName] as DatabaseNode;
				if (!dbNode) {
					dbNode = new DatabaseNode();
				}

				// 记录错误
				failureTasks.push(taskName);

				// 写数据库构建情况
				dbNode.recentStatus.push({
					time: Date.now(),
					timeDescription: Date(),

					success: false,
					errorMessage: 'Error:Can\'t read ' + taskName + '\'s config:' + iRT.payload,
				});
				DB[taskName] = dbNode;
				continue;
			}

			const taskConfig = iRT.payload as Task;

			// 读取数据库中对应节点
			let dbNode = DB[taskName] as DatabaseNode;
			if (!dbNode) {
				dbNode = new DatabaseNode();
			}

			// 清理过多的构建状态信息
			if (dbNode.recentStatus.length > 2) {
				dbNode.recentStatus = cleanBuildStatus(dbNode.recentStatus);
			}

			// 执行task
			const beforeVersion = dbNode.latestVersion;
			const iPT = await processTask(taskConfig, dbNode, p7zip);
			if (iPT.status === Status.ERROR) {
				// 打印错误
				log(iPT.payload);

				// 记录错误
				failureTasks.push(taskName);

				// 写数据库构建情况
				dbNode.recentStatus.push({
					time: Date.now(),
					timeDescription: Date(),

					success: false,
					errorMessage: iPT.payload,
				});
				DB[taskName] = dbNode;
			} else {
				// Task运行成功
				log('Success:Task ' + taskName + ' executed successfully');
				// 写入数据库
				const node = iPT.payload as DatabaseNode;
				node.recentStatus.push({
					time: Date.now(),
					timeDescription: Date(),

					success: true,
					errorMessage: 'Success',
				});
				DB[taskName] = node;
			}

			if (args.hasOwnProperty('g')) {
				// 为GA输出结束分组
				console.log('::endgroup::');

				// 如果被更新则显示更新情况
				const node = iPT.payload as DatabaseNode;
				if (iPT.status == Status.SUCCESS && node.latestVersion != beforeVersion) {
					console.log('Updated from ' + beforeVersion + ' to ' + node.latestVersion);
				}
			}
		}

		// 总结
		console.log('=================================================');
		if (failureTasks.length === 0) {
			log('Success:Everything is Okay');
		} else {
			log(
				'Warning:'
                + failureTasks.length
                + ' tasks failed as follow:'
                + failureTasks.toString(),
			);
		}
	}

	// 打印晴雨表
	barometer(DB);
	console.log('=================================================');

	// 写数据库
	if (!args.hasOwnProperty('d')) {
		saveDatabase(DB);
	} else {
		log('Warning:Database not updated');
	}

	// 停止aria2进程
	await aria2.forceShutdown();
	log('Info:Aria2 assassinated,exit');

	// 如果Actions全局执行出现问题则在此处抛出
	if (args.hasOwnProperty('g') && !args.hasOwnProperty('t') && failureTasks.length > 0) {
		fs.writeFileSync('./actions_failed', failureTasks.length.toString());
	}
}

main().catch(e => {
	throw e;
});
