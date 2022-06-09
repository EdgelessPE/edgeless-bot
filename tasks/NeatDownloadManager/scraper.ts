import {Ok, Err, Result} from 'ts-results';
import {ScraperReturned} from '../../src/class';
import {robustGet} from '../../src/network';
import {log} from '../../src/utils';
import cheerio from 'cheerio';

export default async function (): Promise<Result<ScraperReturned, string>> {
	const $ = cheerio.load((await robustGet('https://www.neatdownloadmanager.com/index.php/en/')).unwrap());

	//YOUR CODE HERE
	let version: string = (/(\d\.\d)/.exec($("#dima_2_2 > div > p.p1").text() as string) ?? [""])[0]

	return new Ok({
		version: version,
		downloadLink: 'https://www.neatdownloadmanager.com/file/NeatDM_setup.exe',
	});
}
