import {Ok, Err, Result} from 'ts-results';
import {ScraperReturned} from '../../src/class';
import {robustGet} from '../../src/network';
import {log,versionCmp,matchVersion, Cmp} from '../../src/utils';
import cheerio from 'cheerio';

export default async function (): Promise<Result<ScraperReturned, string>> {
	//获取js脚本
	let res=await robustGet('https://www.todesk.com/js/common.js')
	const script=res.unwrap() as string

	//匹配kv
	let m=script.match(/WIN_VERSION.+;/)
	if(m==null) return new Err(`Error:Can't match WIN_VERSION`)
	const version=m[0]

	m=script.match(/WIN_DOWNLOAD_URL.+;/)
	if(m==null) return new Err(`Error:Can't match WIN_DOWNLOAD_URL`)
	const downloadLink=m[0].match(/http.+\.exe/)![0]

	
	return new Ok({
		version,
		downloadLink,
	});
}
