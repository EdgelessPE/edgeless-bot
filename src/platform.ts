import os from 'os';
import {Err, Ok, Result} from 'ts-results';
import path from 'path';
import fs from 'fs';
import cp from 'child_process';
import {config} from './config';
import {log} from './utils';

type OS = 'Windows' | 'Linux' | 'MacOS' | 'Other'

function getOS(): OS {
	switch (os.platform()) {
		case 'win32':
			return 'Windows';
		case 'linux':
			return 'Linux';
		case 'darwin':
			return 'MacOS';
		default:
			return 'Other';
	}
}

//查找程序位置，返回值为绝对路径时会包含双引号
function where(command: string): Result<string, string> {
	//生成可能的位置
	let possibleCommands: Array<string> = [];
	let possiblePositions: Array<string> = [];
	switch (command) {
		case 'p7zip':
			possibleCommands =
				[
					'7z',
					'p7zip',
					'7za',
				];
			possiblePositions =
				[
					'./7z.exe',
					'C:/Program Files/7-Zip/7z.exe',
					'C:/Program Files (x86)/7-Zip/7z.exe',
					process.env.PROGRAMFILESW6432 + '/7-Zip/7z.exe',
				];
			break;
		case 'aria2c':
			possibleCommands =
				[
					'aria2c',
				];
			possiblePositions = [
				'./aria2c.exe',
				path.join(os.homedir(), 'scoop/apps/aria2/current/aria2c.exe'),
			];
			break;
		case 'rclone':
			possibleCommands =
				[
					'rclone',
				];
			possiblePositions = [
				'./rclone.exe',
				path.join(os.homedir(), 'scoop/apps/rclone/current/rclone.exe'),
			];
			break;
		default:
			return new Err(`Error:Undefined command argument : ${command}`);
	}
	//查找可能的命令
	let result = '';
	let node;
	let testCmd = getOS() == 'Windows' ? 'where' : 'which';
	//根据possibleCommands查找
	for (let i = 0; i < possibleCommands.length; i++) {
		node = possibleCommands[i];
		//使用which/where
		try {
			cp.execSync(`${testCmd} ${node}`);
			result = node;
			break;
		} catch (_) {
		}
		//生成可能的绝对路径
		let possibleAbsolutePaths = [
			node,
			node + '.exe',
			path.join(process.cwd(), node),
			path.join(__dirname, node),
			path.join(process.cwd(), node + '.exe'),
			path.join(__dirname, node + '.exe'),
		];
		possibleAbsolutePaths.forEach((item) => {
			if (fs.existsSync(item)) {
				result = '"' + item + '"';
			}
		});
	}
	if (result != '') {
		return new Ok(result);
	}
	//根据possiblePositions查找
	for (let i = 0; i < possiblePositions.length; i++) {
		node = possiblePositions[i];
		if (fs.existsSync(node)) {
			result = '"' + node + '"';
			break;
		}
	}
	if (result != '') {
		return new Ok(result);
	} else {
		return new Err(`Error:Can't find command : ${command}`);
	}
}

function ensurePlatform(): boolean {
	let list = ['aria2c', 'p7zip'],
		suc = true;
	if (config.REMOTE_ENABLE) {
		list.push('rclone');
	}
	for (let cmd of list) {
		if (where(cmd).err) {
			suc = false;
			log(`Error:Command ${cmd} not found`);
		}
	}
	return suc;
}

export {
	getOS,
	where,
	OS,
	ensurePlatform,
};
