import {ProducerParameters, ProducerReturned} from '../../src/class';
import {Err, Ok, Result} from 'ts-results';

const shell = require('shelljs');

export default async function (p: ProducerParameters): Promise<Result<ProducerReturned, string>> {

	//YOUR CODE HERE

	return new Ok({
		readyRelativePath: '_ready',
	});
}
