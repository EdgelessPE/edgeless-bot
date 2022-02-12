import {ProducerParameters, ProducerReturned} from '../../src/class';
import {Ok, Result} from 'ts-results';
import {log, writeGBK} from '../../src/utils';
import path from 'path';
import fs from 'fs';

const shell = require('shelljs');

export default async function (p: ProducerParameters): Promise<Result<ProducerReturned, string>> {
	const {taskName, downloadedFile, workshop} = p;

	//YOUR CODE HERE

	return new Ok({
		readyRelativePath: '_ready',
	});
}
