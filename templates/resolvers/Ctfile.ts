import { ResolverParameters, ResolverReturned } from "../../src/class";
import { Err, Ok, Result } from "ts-results";
import { robustGet } from "../../src/network";
import { log } from "../../src/utils";

interface Node {
  type: "File" | "Folder";
  name: string;
  id: string;
  children?: Node[];
}

async function f(url: string, referer: string): Promise<Result<any, string>> {
  return robustGet(url, {
    headers: {
      origin: new URL(referer).origin,
      referer: referer,
    },
  });
}

async function getFileLink(
  fileID: string,
  password: string,
  referer: string
): Promise<Result<string, string>> {
  let jsonUrl = `http://webapi.ctfile.com/getfile.php?path=f&f=${fileID}&passcode=${password}&token=false&r=${Math.random()}`;
  const getFileJsonRes = await f(jsonUrl, referer);
  if (getFileJsonRes.err) {
    return getFileJsonRes;
  }
  const getFileJson = getFileJsonRes.val;

  jsonUrl = `http://webapi.ctfile.com/get_file_url.php?uid=${
    getFileJson.userid
  }&fid=${getFileJson.file_id}&file_chk=${
    getFileJson.file_chk
  }&app=0&acheck=2&rd=${Math.random()}`;
  const getFileUrlJsonRes = await f(jsonUrl, referer);
  if (getFileUrlJsonRes.err) {
    return getFileUrlJsonRes;
  }
  const getFileUrlJson = getFileUrlJsonRes.val;
  if (getFileUrlJson.downurl == null) {
    return new Err(
      "Error:Can't fetch download url :\n" +
        JSON.stringify(getFileUrlJson, null, 2)
    );
  }
  return new Ok(getFileUrlJson.downurl);
}

async function getDirectoryList(
  dirID: string,
  password: string,
  referer: string,
  pathType: "d" | "dir",
  subDir?: string
): Promise<Result<Node[], string>> {
  //发送getDir请求
  const getDirJsonRes = await f(
    `http://webapi.ctfile.com/getdir.php?path=${pathType}&d=${dirID}&folder_id=${
      subDir ?? ""
    }&passcode=${password}&r=${Math.random()}&ref=${referer}`,
    referer
  );
  if (getDirJsonRes.err || getDirJsonRes.val.code != "200") {
    return getDirJsonRes;
  }
  //发送获取文件列表请求
  const getDirListJsonRes = await f(
    "http://webapi.ctfile.com" + getDirJsonRes.val.url,
    referer
  );
  if (getDirListJsonRes.err) {
    return getDirListJsonRes;
  }
  const list = getDirListJsonRes.val as {
    aaData: Array<string[]>;
  };
  //处理文件列表
  let res: Node[] = [],
    text: string,
    m,
    temp,
    id,
    name,
    success = true,
    reason = "";
  for (const item of list.aaData) {
    text = item[1];
    m = text.match(/load_subdir\([0-9]+\)/);
    if (m == null) {
      //说明是文件
      //匹配fileID
      temp = text.match(/tempdir-\w+/);
      if (temp == null) {
        success = false;
        reason = "Error:Can't match fileID in " + text;
        break;
      }
      id = temp[0];
      //匹配名称
      temp = text.match(/[^>]+<\/a>/);
      if (temp == null) {
        success = false;
        reason = "Error:Can't match name in " + text;
        break;
      }
      name = temp[0].slice(0, -4);
      res.push({
        type: "File",
        name,
        id,
      });
    } else {
      //说明是子文件夹
      //获取子文件夹ID
      const subDirID = (m[0].match(/[0-9]+/) as string[])[0];
      //匹配名称
      temp = text.match(/[^>]+<\/a>/);
      if (temp == null) {
        success = false;
        reason = "Error:Can't match name in " + text;
        break;
      }
      name = temp[0].slice(0, -4);
      //获取子文件夹内容
      const childrenRes = await getDirectoryList(
        dirID,
        password,
        referer,
        pathType,
        subDirID
      );
      if (childrenRes.err) {
        return new Err("Error:Can't read sub directory " + name);
      }

      res.push({
        type: "Folder",
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

export default async function (
  p: ResolverParameters
): Promise<Result<ResolverReturned, string>> {
  const { downloadLink, password, cd, fileMatchRegex } = p;
  let fileID;
  //尝试匹配路径类型
  const m = downloadLink.match(/\/(d|dir|f)\/[\w-]+/);
  if (m == null) {
    return new Err(
      "Error:Can't treat download link as ctfile url : " + downloadLink
    );
  }
  //获取路径类型
  const s = m[0].split("/"),
    pathType = s[1] as "d" | "dir" | "f";
  if (pathType == "f") {
    //说明是文件
    //匹配链接中的文件id
    const match = downloadLink.match(/\/f\/[\w-]+/);
    if (match == null) {
      return new Err(
        "Error:Can't match file id in file link url : " + downloadLink
      );
    }
    fileID = match[0].slice(3);
  } else {
    //说明是文件夹，获取文件夹目录结构
    const list = await getDirectoryList(
      s[2],
      password ?? "",
      downloadLink,
      pathType
    );
    //console.log(JSON.stringify(list.val, null, 2));
    //处理cd，确定查找范围
    let checkList: Node[] = [];
    if (cd != undefined && cd.length <= 1) {
      if (cd.length == 1) {
        //查询是否存在一级子文件夹
        let isIn = false;
        for (const n of list) {
          if (n.type == "Folder" && n.name == cd[0]) {
            checkList = n.children as Node[];
            isIn = true;
            break;
          }
        }
        if (!isIn) {
          return new Err("Error:Can't cd to sub directory " + cd[0]);
        }
      } else {
        //length==0,仅在根目录查找
        for (const n of list) {
          if (n.type == "File") {
            checkList.push(n);
          }
        }
      }
    } else {
      if (cd != undefined) {
        log(
          "Warning:Given cd array out of length, ignore (this can be caused by either task config or scraper template) : " +
            cd.toString()
        );
      }
      //查找全部文件
      for (const n of list) {
        if (n.type == "File") {
          checkList.push(n);
        } else {
          checkList = checkList.concat(n.children as Node[]);
        }
      }
    }
    const matchedResults: Node[] = [],
      regex = new RegExp(fileMatchRegex);
    for (const n of checkList) {
      if (n.name.match(regex) != null) {
        log(`Info:Matched file ${n.name}`);
        matchedResults.push(n);
      }
    }
    if (matchedResults.length > 1) {
      log(
        "Warning:Matched more than one result, use the first match, consider modify regex.download_name"
      );
    } else if (matchedResults.length == 0) {
      return new Err("Error:Can't match any file with regex " + regex);
    }

    fileID = matchedResults[0].id;
  }

  //解析
  const r = await getFileLink(fileID, password ?? "", downloadLink);
  if (r.err) {
    return r;
  }

  return new Ok({
    directLink: r.val,
  });
}
