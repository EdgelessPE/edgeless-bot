import {ProducerParameters, ProducerReturned} from '../../src/class';
import {Ok, Err, Result} from 'ts-results';
import {log, writeGBK} from '../../src/utils';
import path from 'path';
import fs from 'fs';
import { release } from "../../src/p7zip";


const shell = require('shelljs');

export default async function (p: ProducerParameters): Promise<Result<ProducerReturned, string>> {
	const {taskName, downloadedFile, workshop} = p;

	const readyDir = path.join(workshop, '_ready', taskName);
	shell.mkdir("-p",path.join(workshop, '_ready'))
	log(`Info: ${downloadedFile}`)
	release(path.join(workshop, downloadedFile), workshop)
	shell.mv(
		path.join(workshop, downloadedFile.split(".")[0]), 
		readyDir
		)
	writeGBK(
		path.join(workshop, "_ready", taskName + ".wcs"),
		`LINK %desktop%\\DreamScene2 X:\\Program Files\\Edgeless\\${taskName}\\DreamScene2.exe"`
		)
	//Return ready directory
	return new Ok({
		readyRelativePath: '_ready',
	});
}