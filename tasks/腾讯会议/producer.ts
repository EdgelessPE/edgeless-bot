import {ProducerParameters, ProducerReturned} from '../../src/class';
import {Err, Ok, Result} from 'ts-results';
import path from 'path';
import {release} from "../../src/p7zip";
import fs from "fs";

const shell = require('shelljs');

export default async function (p: ProducerParameters): Promise<Result<ProducerReturned, string>> {
	const {taskName, downloadedFile, workshop, version} = p;

	//Create ready directory
	const readyDir = path.join(workshop, '_ready', taskName);
	shell.mkdir('-p', readyDir);

	//解压压缩包
	if (!(await release(path.join(workshop, downloadedFile), readyDir))) {
		return new Err(`Error:Can't unzip Tencent Meeting Installer`)
	}

	//删除助手文件夹
	shell.rm('-rf', [
			"$PLUGINSDIR",
			"$TEMP",
			"$WINDIR"
		].map((file) => path.join(readyDir, file))
	)

	//重命名依赖文件夹
	shell.mv(path.join(readyDir, "$_9_"), path.join(readyDir, version))

	//自检
	if (!fs.existsSync(path.join(readyDir, version, "WeMeetUninstall.exe")) || !fs.existsSync(path.join(readyDir, "wemeetapp.exe"))) {
		return new Err(`Error:Self check failed`)
	}

	//Return ready directory
	return new Ok({
		readyRelativePath: '_ready',
	});
}
