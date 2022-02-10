import {ResolverParameters, ResolverReturned} from '../../src/class';
import {Err, Ok, Result} from 'ts-results';
import {robustGet} from '../../src/network';

async function f(url: string, referer: string): Promise<Result<any, string>> {
	return robustGet(url, {
		headers: {
			origin: referer,
			referer: referer,
		},
	});
}

async function file2Link(fileID: string, password: string, referer: string): Promise<Result<string, string>> {
	let jsonUrl = `https://webapi.ctfile.com/getfile.php?path=f&f=${fileID}&passcode=${password}&token=false&r=${Math.random()}`;
	let getFileJsonRes = await f(jsonUrl, referer);
	if (getFileJsonRes.err) {
		return getFileJsonRes;
	}
	let getFileJson = getFileJsonRes.val;

	jsonUrl = `https://webapi.ctfile.com/get_file_url.php?uid=${getFileJson.userid}&fid=${getFileJson.file_id}&file_chk=${getFileJson.file_chk}&app=0&acheck=2&rd=${Math.random()}`;
	let getFileUrlJsonRes = await f(jsonUrl, referer);
	if (getFileUrlJsonRes.err) {
		return getFileUrlJsonRes;
	}
	let getFileUrlJson = getFileUrlJsonRes.val;
	return new Ok(getFileUrlJson.downurl);
}

export default async function (p: ResolverParameters): Promise<Result<ResolverReturned, string>> {
	let {downloadLink, password, cd, fileMatchRegex} = p;
	//TODO:实现对城通文件夹的访问
	let fileLink = downloadLink;

	//匹配链接中的文件id
	let match = fileLink.match(/\/f\/[\w-]+/);
	if (match == null) {
		return new Err('Error:Can\'t match file id in file link url : ' + fileLink);
	}
	let fileID = match[0].slice(3);
	//解析
	let r = await file2Link(fileID, password ?? '', fileLink);
	if (r.err) {
		return r;
	}

	return new Ok({
		directLink: r.val,
	});
}
