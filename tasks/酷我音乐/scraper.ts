import {Ok, Result} from 'ts-results';
import {ScraperReturned} from '../../src/class';

export default async function (): Promise<Result<ScraperReturned, string>> {
	return new Ok({
		version: 'https://down.kuwo.cn/mbox/kwmusic_web_4.exe',
		downloadLink: '0',
	});
}