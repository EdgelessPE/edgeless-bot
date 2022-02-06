import {Ok, Result, Err} from 'ts-results';
import {ScraperReturned} from '../../src/class';
import {robustGet} from '../../src/network';

export default async function (): Promise<Result<ScraperReturned, string>> {

	//YOUR CODE HERE

	return new Ok({
		version: '0.0.0',
		downloadLink: 'http://localhost/file.exe',
	});
}
