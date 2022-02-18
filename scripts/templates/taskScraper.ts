import {Ok, Err, Result} from 'ts-results';
import {ScraperReturned} from '../../src/class';
import {robustGet} from '../../src/network';
import {log} from '../../src/utils';
import cheerio from 'cheerio';

export default async function (): Promise<Result<ScraperReturned, string>> {
	const $ = cheerio.load((await robustGet('http://localhost')).unwrap());

	//YOUR CODE HERE

	return new Ok({
		version: '0.0.0',
		downloadLink: 'http://localhost/file.exe',
	});
}
