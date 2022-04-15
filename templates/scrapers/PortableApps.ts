import {Err, Ok, Result} from 'ts-results';
import {ScraperParameters, ScraperReturned} from '../../src/class';
import {robustGet} from '../../src/network';
import cheerio from 'cheerio';
import {log} from '../../src/utils';
import {config} from '../../src/config';

interface PageInfo {
	text: string;
	href: string;
	md5: string;
}

// 控制是否详细打印日志
const DEBUG=false

function parseDownloadUrl(href: string): string {
	// 识别根目录字符“/”
	if (href[0] === '/') {
		href = 'https://portableapps.com' + href;
	}

	// 识别downloading，替换为redirect
	href = href.replace('downloading', 'redirect');

	// URL编码
	href = encodeURI(href);

	// log("Info:Parse download link into:" + href)
	return href;
}

async function scrapePage(
	page: string,
): Promise<Result<PageInfo, string>> {
	const result = ({} as unknown) as PageInfo;

	// 配置可识别的类名
	const validClassName = ['.download-link', '.download-info'];

	// 挂载HTML
	const $ = cheerio.load(page);

	// 获取download-box DOM
	const dom_box = $('.download-box');

	// 判断dom_box是否有效
	if (!dom_box) {
		return new Err('Error:DOM_DOWNLOAD_BOX not found');
	}

	// 获取有效节点
	let dom_node;
	for (let i of validClassName) {
		dom_node = dom_box.children(i);
		if (dom_node.attr('class')) {
			break;
		}
	}

	// 判断dom_node是否有效
	if (!dom_node?.attr('class')) {
		return new Err('Error:Valid dom node not found');
	} else {
		//log('Info:Get valid dom node whose class is "' + dom_node.attr('class') + '"');
	}

	// 尝试获取MD5
	const md5TagResult = $('strong:contains(\'MD5\')');
	if (md5TagResult.length === 0) {
		log('Warning:No MD5 tag found in this page');
	} else {
		try {
			result.md5 = (md5TagResult
				.parent('li')
				.get(0)
				.children[1] as any).data.substring(2);
		} catch (err) {
			console.log(JSON.stringify(err));
			log('Warning:Fail to get MD5 value');
		}
	}

	// 分className处理，获取text和href
	switch (dom_node.attr('class')) {
		case 'download-link':
			log('Warning:You may provided a short term supported application,please check the paUrl');
			result.text = dom_node.text();
			result.href = dom_node.attr('href') as string;
			break;
		case 'download-info':
			// 获取box的首个子节点
			const dom_btn = dom_box.children('a');

			// 产生两个属性
			result.text = dom_node.text();
			result.href = dom_btn.attr('href') as string;

			// 查询是否为多语言
			if (result.text.match(/Multilingual/) == null) {
				// 匹配是否为英文
				if (result.text.match(/English/)) {
					// 尝试获取多语言下载列表
					if (DEBUG) log(
						'Info:English application detected,trying to match simplified chinese version',
					);
					const table = $('.zebra.download-links');
					if (table.length > 0) {
						// 获取简体中文下载地址
						const recordParent = table
							.find('td:contains(\'Simplified\')')
							.parent('tr');
						if (recordParent.length > 0) {
							// 获得下载地址
							result.href = recordParent.find('a').get(0).attribs.href;
							// 尝试获得md5
							try {
								result.md5 = (recordParent
									.children('td')
									.get(3).children[0] as any).data;
							} catch (err) {
								console.log(JSON.stringify(err));
								log('Warning:Fail to got md5');
							}

							if (DEBUG) log(
								'Info:Found simplified chinese version\nmd5:'
								+ result.md5
								+ '\ndownload link:'
								+ result.href,
							);
						} else {
							if (DEBUG) {
								log(
									'Info:Simplified chinese version not found,use English version',
								);
							}
						}
					} else {
						if (DEBUG) {
							log('Info:Localizations table not found,use English version');
						}
					}
				} else {
					log(
						'Warning:Minority language application detected,check the default language',
					);
				}
			}

			break;
	}

	// 校验结果是否有效
	if (!result.text || !result.href) {
		return new Err('Error:Null value caught in result');
	}

	//正则检查链接
	// if (!isURL(result.href)) {
	// 	return new Result({
	// 		status: Status.ERROR,
	// 		payload: (('Error:Illegal download link got:' + result.href + ',can\'t scrape '
	// 			+ url) as unknown) as PageInfo,
	// 	});
	// }

	// 校验md5
	if (result.md5 == undefined) {
		result.md5 = '';
	}

	if (
		result.md5 !== ''
		&& result.md5.match(/([a-f\d]{32}|[A-F\d]{32})/) == null
	) {
		log('Warning:Fail to check md5,got ' + result.md5);
		result.md5 = '';
	}

	// 处理href
	result.href = parseDownloadUrl(result.href);

	return new Ok(result);
}

export default async function (p: ScraperParameters): Promise<Result<ScraperReturned, string>> {
	//获取页面
	let page = (await robustGet(p.url)).unwrap();
	//解析
	let {text, href, md5} = (await scrapePage(page)).unwrap();

	return new Ok({
		version: text,
		downloadLink: href,
		validation: md5 == '' ? undefined : {
			type: "MD5",
			value: md5
		}
	});
}
