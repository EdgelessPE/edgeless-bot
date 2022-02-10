import {ResolverParameters, ResolverReturned} from '../../src/class';
import {Err, Ok, Result} from 'ts-results';
import {robustGet} from '../../src/network';

interface Node {
	type: 'File' | 'Folder';
	name: string;
	id: string;
	children?: Node[];
}

async function f(url: string, referer: string): Promise<Result<any, string>> {
	return robustGet(url, {
		headers: {
			origin: (new URL(referer)).origin,
			referer: referer,
		},
	});
}

async function getFileLink(fileID: string, password: string, referer: string): Promise<Result<string, string>> {
	let jsonUrl = `http://webapi.ctfile.com/getfile.php?path=f&f=${fileID}&passcode=${password}&token=false&r=${Math.random()}`;
	let getFileJsonRes = await f(jsonUrl, referer);
	if (getFileJsonRes.err) {
		return getFileJsonRes;
	}
	let getFileJson = getFileJsonRes.val;

	jsonUrl = `http://webapi.ctfile.com/get_file_url.php?uid=${getFileJson.userid}&fid=${getFileJson.file_id}&file_chk=${getFileJson.file_chk}&app=0&acheck=2&rd=${Math.random()}`;
	let getFileUrlJsonRes = await f(jsonUrl, referer);
	if (getFileUrlJsonRes.err) {
		return getFileUrlJsonRes;
	}
	let getFileUrlJson = getFileUrlJsonRes.val;
	return new Ok(getFileUrlJson.downurl);
}

async function getDirectoryList(dirID: string, password: string, referer: string, subDir?: string): Promise<Result<Node[], string>> {
	//发送getDir请求
	let getDirJsonRes = await f(`http://webapi.ctfile.com/getdir.php?path=d&d=${dirID}&folder_id=${subDir ?? ''}&passcode=${password}&r=${Math.random()}&ref=${referer}`, referer);
	if (getDirJsonRes.err || getDirJsonRes.val.code != '200') {
		getDirJsonRes = await f(`http://webapi.ctfile.com/getdir.php?path=dir&d=${dirID}&folder_id=${subDir ?? ''}&passcode=${password}&r=${Math.random()}&ref=${referer}`, referer);
		if (getDirJsonRes.err || getDirJsonRes.val.code != '200') {
			return getDirJsonRes;
		}
	}
	//发送获取文件列表请求
	let getDirListJsonRes = await f('http://webapi.ctfile.com' + getDirJsonRes.val.url, referer);
	if (getDirListJsonRes.err) {
		return getDirListJsonRes;
	}
	let list = getDirListJsonRes.val as {
		aaData: Array<string[]>
	};
	//处理文件列表
	let res: Node[] = [],
		text: string,
		m,
		temp,
		id,
		name,
		success = true,
		reason = '';
	for (let item of list.aaData) {
		text = item[1];
		m = text.match(/load_subdir\([0-9]+\)/);
		if (m == null) {
			//说明是文件
			//匹配fileID
			temp = text.match(/tempdir-\w+/);
			if (temp == null) {
				success = false;
				reason = 'Error:Can\'t match fileID in ' + text;
				break;
			}
			id = temp[0];
			//匹配名称
			temp = text.match(/[^>]+<\/a>/);
			if (temp == null) {
				success = false;
				reason = 'Error:Can\'t match name in ' + text;
				break;
			}
			name = temp[0].slice(0, -4);
			res.push({
				type: 'File',
				name,
				id,
			});
		} else {
			//说明是子文件夹
			//获取子文件夹ID
			let subDirID = (m[0].match(/[0-9]+/) as string[])[0];
			//匹配名称
			temp = text.match(/[^>]+<\/a>/);
			if (temp == null) {
				success = false;
				reason = 'Error:Can\'t match name in ' + text;
				break;
			}
			name = temp[0].slice(0, -4);
			//获取子文件夹内容
			let childrenRes = await getDirectoryList(dirID, password, referer, subDirID);
			if (childrenRes.err) {
				return new Err('Error:Can\'t read sub directory ' + name);
			}

			res.push({
				type: 'Folder',
				name,
				id: subDirID,
				children: childrenRes.val,
			});
		}
	}
	if (!success) {
		return new Err(reason);
	} else {
		return new Ok(res);
	}
}

export default async function (p: ResolverParameters): Promise<Result<ResolverReturned, string>> {
	let {downloadLink, password, cd, fileMatchRegex} = p;
	//TODO:实现对城通文件夹的访问
	let list = await getDirectoryList('7369060-21548259-bbf644', '3519', 'http://ct.ghpym.com/d/7369060-41512272-c60399');
	console.log(JSON.stringify(list.val, null, 2));
	return new Err('Info:Test');
	//
	// let fileLink = downloadLink;
	//
	// //匹配链接中的文件id
	// let match = fileLink.match(/\/f\/[\w-]+/);
	// if (match == null) {
	// 	return new Err('Error:Can\'t match file id in file link url : ' + fileLink);
	// }
	// let fileID = match[0].slice(3);
	// //解析
	// let r = await getFileLink(fileID, password ?? '', fileLink);
	// if (r.err) {
	// 	return r;
	// }
	//
	// return new Ok({
	// 	directLink: r.val,
	// });
}
