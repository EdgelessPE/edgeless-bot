import {Ok, Result} from 'ts-results';
import {ScraperReturned} from '../../src/class';
import {robustGet} from '../../src/network';
import {log, versionCmp, Cmp, fromGBK} from '../../src/utils';

export default async function (): Promise<Result<ScraperReturned, string>> {

	let version = '0.0',
		url = '';
	//获取官网首页
	let page = (await robustGet('https://pinyin.sogou.com/')).unwrap() as string;
	//匹配出js中的所有下载地址
	let matches = page.match(/window\.location\.href="\S*"/g) as RegExpMatchArray;
	//筛选掉10版本（XP专用版）
	matches.forEach((item) => {
		if (item.match('sogou_pinyin_10') == null) {
			url = item.split('="')[1].slice(0, -1);
		}
	});
	log('Info:Matched url ' + url);

	//获取升级日志页面
	let versionPage = (await robustGet('https://pinyin.sogou.com/changelog.php')).unwrap() as string;
	//匹配所有的正式版发布信息
	//console.log(gb2312(page.data))
	matches = versionPage.match(/\d*\.\d*\S*<\/h2>/) as RegExpMatchArray;
	//获取其中最高的版本号
	let match;
	matches.forEach((item) => {
		//提取版本号
		match = item.match(/\d*\.\d*/);
		if (match && versionCmp(version, match[0]) == Cmp.L) {
			version = match[0];
		}
	});
	log('Info:Matched version ' + version);

	return new Ok({
		version,
		downloadLink: url,
	});
}
