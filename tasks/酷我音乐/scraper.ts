import {Ok, Result} from 'ts-results';
import {ScraperReturned} from '../../src/class';
import {sleep} from '../../src/utils';

export default async function (): Promise<Result<ScraperReturned, string>> {
	await sleep(1000);
	return new Ok({
		downloadLink: 'https://down.kuwo.cn/mbox/kwmusic_web_4.exe',
		version: '0.0.0',
	});
}