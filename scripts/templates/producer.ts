import {ProducerParameters, ProducerReturned} from '../../src/class';
import {Err, Ok, Result} from 'ts-results';

const shell = require('shelljs');

interface RequiredObject {
}

export default async function (p: ProducerParameters): Promise<Result<ProducerReturned, string>> {
	const obj = p.requiredObject as RequiredObject;

	//YOUR CODE HERE

	return new Ok({
		readyRelativePath: '_ready',
	});
}
