import {ProducerParameters, ProducerReturned} from '../../src/class';
import {Ok, Err, Result} from 'ts-results';
import {log, writeGBK} from '../../src/utils';
import path from 'path';
import fs from 'fs';

const shell = require('shelljs');

export default async function (p: ProducerParameters): Promise<Result<ProducerReturned, string>> {
	const {taskName, downloadedFile, workshop} = p;


	const readyDir = path.join(workshop, '_ready', taskName);
	shell.mkdir('-p', readyDir);

	writeGBK(
		path.join(workshop, "_ready", taskName + ".cmd"),
		`exec !setx Path "%PATH%;X:\\Program Files\\Edgeless\\${taskName}"`
		)
	//Return ready directory
	return new Ok({
		readyRelativePath: '_ready',
	});
}
