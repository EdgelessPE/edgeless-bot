import {Ok, Result} from 'ts-results';
import {ScraperParameters, ScraperReturned} from '../../src/class';

export default async function (p: ScraperParameters): Promise<Result<ScraperReturned, string>> {

	//YOUR CODE HERE

	return new Ok({
		version: '0.0.0',
		downloadLink: 'http://localhost/file.exe',
	});
}
