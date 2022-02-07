import {ProducerParameters, ProducerReturned} from '../../src/class';
import fs from 'fs';
import {Err, Ok, Result} from 'ts-results';
import path from 'path';
import {toGBK} from '../../src/utils';
import {release} from '../../src/p7zip';

const shell = require('shelljs');

interface RequiredObject {
	recursiveUnzipList: Array<string>;
	sourceFile: string;
	shortcutName: string;
}

function matchFile(cwd: string, regex: string): Result<string, string> {
	let dir = fs.readdirSync(cwd);
	let m = undefined,
		r = new RegExp(regex);
	for (let name of dir) {
		if (name.match(r) != null) {
			m = name;
			break;
		}
	}
	if (m == undefined) {
		return new Err('');
	} else {
		return new Ok(m);
	}
}

export default async function (p: ProducerParameters): Promise<Result<ProducerReturned, string>> {
	//递归解压
	let cwd = p.workshop,
		obj = p.requiredObject as RequiredObject,
		level = 1,
		success = true,
		reason = '',
		m,
		file: string
	;
	for (let reg of [p.downloadedFile].concat(obj.recursiveUnzipList)) {
		//校验文件是否存在
		m = matchFile(cwd, reg);
		if (m.err) {
			reason = `Error:Can't find file matching ${reg} at ${cwd} during the ${level} recursion`;
			success = false;
			break;
		}
		file = m.val;
		//尝试解压
		success = await release(file, level.toString(), true, cwd);
		if (!success) {
			reason = `Error:Can't unzip file ${file} at ${cwd} during the ${level} recursion`;
			success = false;
			break;
		}
		//准备下次递归
		cwd = cwd + '/' + level.toString();
		level++;
	}
	if (!success) {
		return new Err(reason);
	}
	//确认是否存在目标文件
	if (!fs.existsSync(path.join(cwd, obj.sourceFile))) {
		return new Err(`Error:Can't find source file ${obj.sourceFile} in ${cwd}`);
	}
	//重命名并生成外置批处理
	let final = path.join(p.workshop, '_ready');
	shell.mkdir(final);
	shell.mv(cwd, final + '/' + p.taskName);
	fs.writeFileSync(path.join(final, p.taskName + '.wcs'), toGBK(`LINK X:\\Users\\Default\\Desktop\\${obj.shortcutName},%ProgramFiles%\\Edgeless\\${p.taskName}\\${obj.sourceFile}`));
	//自检
	const exist = function (p: string): boolean {
		return fs.existsSync(path.join(final, p));
	};
	if (exist(p.taskName + '.wcs') && exist(p.taskName + '/' + obj.sourceFile)) {
		return new Ok({
			readyRelativePath: '_ready',
		});
	} else {
		return new Err('Error:Recursive_Unzip self check failed due to file missing in ready folder');
	}
}
