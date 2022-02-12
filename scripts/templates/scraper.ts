import {Ok, Result} from 'ts-results';
import {ScraperParameters, ScraperReturned} from '../../src/class';
import {robustGet} from '../../src/network';
import {log} from '../../src/utils';

export default async function (p: ScraperParameters): Promise<Result<ScraperReturned, string>> {
	const {taskName, url, downloadLinkRegex, versionMatchRegex, scraper_temp} = p;

	//YOUR CODE HERE

	return new Ok({
		version: '0.0.0',
		downloadLink: 'http://localhost/file.exe',
	});
}
