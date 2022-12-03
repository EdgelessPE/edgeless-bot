import {Ok, Result} from 'ts-results';
import {ScraperReturned} from '../../src/class';
import {robustGet} from '../../src/network';

const cheerio = require("cheerio")

export default async function (): Promise<Result<ScraperReturned, string>> {
	let version,
		downloadLink;
	//请求官网
	const page = (await robustGet('https://portableapps.com/apps/office/libreoffice_portable')).unwrap() as string;
	const $ = cheerio.load(page);
	version = $('#node-54208 > div > div.field.field-name-field-app-header-and-download.field-type-computed.field-label-hidden > div > div > div:nth-child(3) > p').text().match(/Version (?<Version>\d+.\d+.\d+)/).groups.Version
	downloadLink = `https://mirrors.cloud.tencent.com/libreoffice/libreoffice/portable/${version}/LibreOfficePortable_${version}_MultilingualAll.paf.exe`
	return new Ok({
		version,
		downloadLink,
	});
}
