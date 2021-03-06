import {Ok, Err, Result} from 'ts-results';
import {ScraperReturned} from '../../src/class';
import {robustGet} from '../../src/network';
import {log} from '../../src/utils';

export default async function (): Promise<Result<ScraperReturned, string>> {
	let version,
		downloadLink;
	//请求官网
	let page = (await robustGet('https://www.u.tools/')).unwrap() as string;
	//匹配publishURL
	let pum = page.match(/publishURL\s*=\s*'http\S*/) as RegExpMatchArray;
	let publishURL = pum[0].split('\'')[1];
	//匹配package
	let pm = page.match(/uTools-\d*\.\d*\.\d*\.exe/) as RegExpMatchArray;
	let name = pm[0];
	downloadLink = publishURL + name;
	//匹配版本号
	let vm = name.match(/\d*\.\d*\.\d*/) as RegExpMatchArray;
	version = vm[0];

	return new Ok({
		version,
		downloadLink,
	});
}
