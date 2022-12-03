import {ResolverParameters, ResolverReturned} from '../../src/class';
import {Err, Ok, Result} from 'ts-results';
import {robustGet} from '../../src/network';
import {log} from '../../src/utils';

export default async function (p: ResolverParameters): Promise<Result<ResolverReturned, string>> {
	const {downloadLink, fileMatchRegex} = p;

	//获取Json
	let json;
	try {
		json = (await robustGet(downloadLink)).unwrap();
	} catch (e) {
		console.log(JSON.stringify(e));
		return new Err(`Error:Can't fetch ${downloadLink}`);
	}
	//匹配assets数组
	let regex = new RegExp(fileMatchRegex),
		i = 0;
	//过滤预发布
	while (json[i].prerelease && i < json.length) {
		i++;
	}
	//防止越界
	if (i == json.length) {
		i = 0;
	}
	const assets = json[i].assets;
	let result = '',
		node;
	for (node of assets) {
		if (node == null) {
			continue;
		}
		if ((node.name as string).match(regex) != null) {
			if (result == '') {
				result = node.browser_download_url;
				log(`Info:Matched ${node.name}`);
			} else {
				log(`Warning:Ambiguous fileMatchRegex,matched more than one file : ${node.name}`);
			}
		}
	}
	if (result == '') {
		return new Err('Error:Can\'t match any file with given fileMatchRegex');
	} else {
		return new Ok({
			directLink: result,
		});
	}

}
