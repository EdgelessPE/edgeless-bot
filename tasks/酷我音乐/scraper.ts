import {Ok, Result} from 'ts-results';
import {ScraperReturned} from '../../src/class';

let version: string,
	url: string;

async function init() {
	url = 'https://down.kuwo.cn/mbox/kwmusic_web_4.exe';
	version = '0';
}

function getVersion(): string {
	return version;
}

function getDownloadLink(): string {
	return url;
}

export default async function (): Promise<Result<ScraperReturned, string>> {
	await init();
	return new Ok({
		version: getVersion(),
		downloadLink: getDownloadLink(),
	});
}
