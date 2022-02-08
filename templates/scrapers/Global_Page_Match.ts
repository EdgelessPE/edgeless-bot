import {Err, Ok, Result} from 'ts-results';
import {ScraperParameters, ScraperReturned} from '../../src/class';
import {robustGet} from '../../src/network';
import {Cmp, log, matchVersion, versionCmp} from '../../src/utils';

export default async function (p: ScraperParameters): Promise<Result<ScraperReturned, string>> {
	//处理regex为空异常
	if (p.versionMatchRegex == undefined || p.downloadLinkRegex == undefined) {
		return new Err('Error:Regex undefined for global page match');
	}
	//获取页面
	let page = (await robustGet(p.url)).unwrap() as string;
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
