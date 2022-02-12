import {Err, Ok, Result} from 'ts-results';
import {ScraperParameters, ScraperReturned} from '../../src/class';
import {robustGet} from '../../src/network';
import {Cmp, log, matchVersion, versionCmp} from '../../src/utils';
import cheerio from 'cheerio';

interface Temp {
	version_page_url?: string;
	download_page_url?: string;
	selector?: string;
}

export default async function (p: ScraperParameters): Promise<Result<ScraperReturned, string>> {
	const temp: Temp = p.scraper_temp;
	//处理regex为空异常
	if (p.versionMatchRegex == undefined || p.downloadLinkRegex == undefined) {
		return new Err('Error:Regex undefined for global page match');
	}
	//获取页面
	let page = (await robustGet(temp.version_page_url ?? p.url)).unwrap() as string;
	//处理定义的选择器
	if (temp.selector != undefined) {
		const $ = cheerio.load(page);
		page = $(temp.selector).text();
		log('Info:Narrow scope by selector : ' + page);
	}
	//全局匹配版本号
	let m = page.match(p.versionMatchRegex);
	if (m == null) {
		return new Err('Error:Given version match regex matched nothing');
	}
	log('Info:Version match result : ' + m.toString() + (m.length > 1 ? ', use the highest one' : ''));
	let version = '0.0.0',
		tmp;
	for (let node of m) {
		tmp = matchVersion(node);
		if (tmp.err) {
			continue;
		}
		if (versionCmp(tmp.val, version) == Cmp.G) {
			version = tmp.val;
		}
	}
	if (version == '0.0.0') {
		return new Err('Error:Given version match regex matched no version string');
	}

	//全局匹配下载地址
	if (temp.download_page_url != undefined) {
		page = (await robustGet(temp.download_page_url)).unwrap() as string;
	}
	m = page.match(p.downloadLinkRegex);
	if (m == null) {
		return new Err('Error:Given download link match regex matched nothing');
	}
	if (m.length > 1) {
		log(`Warning:Matched multiple outcomes : ${m.toString()}, use the first one, consider modify regex.downloadLinkRegex`);
	}

	return new Ok({
		version,
		downloadLink: m[0],
	});
}
