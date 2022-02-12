import {ProducerParameters, ProducerReturned} from '../../src/class';
import {Err, Ok, Result} from 'ts-results';
import path from 'path';
import fs from 'fs';

const shell = require('shelljs');

interface RequiredObject {
	argument?: string;
	deleteInstaller?: boolean;
}

export default async function (p: ProducerParameters): Promise<Result<ProducerReturned, string>> {
	const {taskName, downloadedFile, workshop} = p;
	const obj = p.requiredObject as RequiredObject;
	const arg = obj.argument ?? '/S',
		del = obj.deleteInstaller ?? false;

	const readyPath = path.join(workshop, '_ready'),
		wcsPath = path.join(readyPath, taskName + '.wcs'),
		fileDir = path.join(readyPath, taskName);
	shell.mkdir('-p', fileDir);
	shell.cp(path.join(workshop, downloadedFile), fileDir + '/');

	let text = `EXEC =! %ProgramFiles%\\Edgeless\\${taskName}\\${downloadedFile} ${arg}`;
	if (del) {
		text += `\nFILE %ProgramFiles%\\Edgeless\\${taskName}\\${downloadedFile}`;
	}
	fs.writeFileSync(wcsPath, text);

	if (fs.existsSync(wcsPath) && fs.existsSync(path.join(fileDir, downloadedFile))) {
		return new Ok({
			readyRelativePath: '_ready',
		});
	} else {
		return new Err('Error:Silent_Install self check failed due to file missing in ready folder');
	}
}
