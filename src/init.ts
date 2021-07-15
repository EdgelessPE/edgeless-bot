import fs from 'fs';
import cp from 'child_process';
import {log, rd} from './utils';
import {DIR_WORKSHOP, DIR_BUILDS, DIR_TASKS, IGNORE_REMOTE} from './const';
import {Interface} from './class';
import {Status} from './enum';

interface RunChecker {
    cmd: string;
    hint: string;
    onerror: (displayError: () => boolean) => boolean | void;
}

function beforeRunCheck(gam: boolean): boolean {
	// 预设严重错误函数
	const l = function (text: string): boolean {
		log('Error:Check failure, ' + text);
		return false;
	};

	// 检查是否在Windows中
	if (!fs.existsSync('C:\\Windows\\System32')) {
		return l('Please run inside Windows');
	}

	// 检查目录中文件夹是否到位
	const dirList: Array<string> = [DIR_BUILDS, DIR_TASKS];
	dirList.forEach(path => {
		if (!fs.existsSync(path)) {
			fs.mkdirSync(path);
			if (!fs.existsSync(path)) {
				return l('Can\'t create folder ' + path);
			}
		}
	});
	// 检查命令可用性
	const cmdList: Array<RunChecker> = [
		{
			cmd: 'rclone',
			hint: 'rclone',
			onerror: d => {
				if (!IGNORE_REMOTE) {
					d();
					log('Warning:Command `rclone` not found, remote disabled');
					return true;
				}

				if (gam) {
					return fs.existsSync('./rclone.exe') && fs.existsSync('./rclone.conf');
				}

				return false;
			},
		},
	];
	cmdList.forEach(item => {
		try {
			cp.execSync('where ' + item.cmd, {
				stdio: 'ignore',
			});
		} catch (err) {
			console.log(err.output.toString());
			return (
				item.onerror(() =>
					l(
						'Command `'
                        + item.cmd
                        + '` not found'
                        + ', please install '
                        + item.hint
                        + '\nTry `scoop install '
                        + item.hint
                        + '` if you have scoop installed',
					),
				) ?? false
			);
		}
	});

	return true;
}

function cleanWorkshop(): boolean {
	const dst = DIR_WORKSHOP.substring(2);
	if (!rd(dst)) {
		log('Error:Can\'t remove workshop,kill running processes and retry');
		return false;
	}

	fs.mkdirSync(dst);
	return fs.existsSync(dst);
}

function find7zip(): Interface {
	let result = null;

	// 使用是否存在判断
	const possiblePath = [
		'C:\\Program Files\\7-Zip\\7z.exe',
		'C:\\Program Files (x86)\\7-Zip\\7z.exe',
		process.env.WINDIR + '\\system32\\7z.exe',
		process.env.PROGRAMFILESW6432 + '\\7-Zip\\7z.exe',
		...(process.env['ProgramFiles(x86)'] != undefined
			? [process.env['ProgramFiles(x86)'] + '\\7-Zip\\7z.exe']
			: []),
	];
	for (const i in possiblePath) {
		if (fs.existsSync(possiblePath[i])) {
			result = possiblePath[i];
			break;
		}
	}

	// 使用where判断
	if (!result) {
		const possibleName: Array<string> = ['7z', '7zz', '7za'];
		for (const i in possibleName) {
			try {
				cp.execSync('where ' + possibleName[i]);
				result = possibleName[i];
				break;
			} catch (e) {
				continue;
			}
		}
	}

	if (!result) {
		return new Interface({
			status: Status.ERROR,
			payload:
                'Error:7-Zip not found,please install 7-Zip from https://www.7-zip.org',
		});
	}

	return new Interface({
		status: Status.SUCCESS,
		payload: result,
	});
} // Interface:string

export {
	beforeRunCheck,
	cleanWorkshop,
	find7zip,
};
