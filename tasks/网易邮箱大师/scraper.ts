import {Ok, Result} from 'ts-results';
import {ScraperReturned} from '../../src/class';

export default async function (): Promise<Result<ScraperReturned, string>> {

	//YOUR CODE HERE

	return new Ok({
		version: '0.0.0',
		downloadLink: 'https://u.163.com/pcds',
	});
}
