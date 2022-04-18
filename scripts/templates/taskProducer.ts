import {ProducerParameters, ProducerReturned} from '../../src/class';
import {Ok, Result} from 'ts-results';
import path from 'path';

const shell = require('shelljs');

export default async function (p: ProducerParameters): Promise<Result<ProducerReturned, string>> {
	const {taskName, downloadedFile, workshop, version} = p;

	//Create ready directory
	const readyDir = path.join(workshop, '_ready', taskName);
	shell.mkdir('-p', readyDir);

	//YOUR CODE HERE

	//Return ready directory
	return new Ok({
		readyRelativePath: '_ready',
	});
}
