import {Err, Ok, Result} from 'ts-results';
import {robustGet} from '../../src/network';
import {ScraperParameters, ScraperReturned} from '../../src/class';

function parseRepo(url: string): { owner: string, repo: string } {
	const splitRes = url.split('github.com/')[1].split('/');
	return {
		owner: splitRes[0],
		repo: splitRes[1],
	};
}

export default async function (p: ScraperParameters): Promise<Result<ScraperReturned, string>> {
	const {url} = p;
	let version: string,
		downloadLink: string;
	const repoInfo = parseRepo(url);

	//将API接口直接作为下载地址返回，后续会由GitHub Release下载模板解析
	downloadLink = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/releases`;

	//获取Json
	let json;
	try {
		json = (await robustGet(downloadLink)).unwrap();
	} catch (e) {
		console.log(JSON.stringify(e));
		return new Err(`Error:Can't fetch ${downloadLink}`);
	}
	let i = 0;
	//过滤预发布
	while (json[i].prerelease && i < json.length) {
		i++;
	}
	//防止越界
	if (i == json.length) {
		i = 0;
	}
	version = json[i].tag_name;
	return new Ok({
		version,
		downloadLink,
	});
}
