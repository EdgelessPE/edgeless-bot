import {ProducerParameters, ProducerReturned} from '../../src/class';
import {Ok, Result} from 'ts-results';
import path from 'path';

const shell = require('shelljs');

interface RequiredObject {
}

export default async function (p: ProducerParameters): Promise<Result<ProducerReturned, string>> {
	const {taskName, downloadedFile, workshop, version} = p;
	const obj = p.requiredObject as RequiredObject;

	//Create ready directory
	const contentDir = path.join(workshop, '_ready', taskName);
	shell.mkdir('-p', contentDir);

	//YOUR CODE HERE

	//Return ready directory
	return new Ok({
		readyRelativePath: '_ready',
	});
}
