import { Err, Ok, Result } from "ts-results";
import { robustGet } from "../../src/network";
import { ScraperParameters, ScraperReturned } from "../../src/types/class";
import { AxiosRequestConfig } from "axios";
import { coverSecret, log } from "../../src/utils";

function parseRepo(url: string): { owner: string; repo: string } {
  const splitRes = url.split("github.com/")[1].split("/");
  return {
    owner: splitRes[0],
    repo: splitRes[1],
  };
}

export default async function (
  p: ScraperParameters,
): Promise<Result<ScraperReturned, string>> {
  const { url } = p,
    repoInfo = parseRepo(url);

  //将API接口直接作为下载地址返回，后续会由GitHub Release下载模板解析
  const downloadLink = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/releases`;

  //获取Json
  let json: any;
  try {
    const token = process.env.GITHUB_TOKEN;
    if (token) log(`Info:Use GitHub Token ${coverSecret(token)}`);
    const cfg: AxiosRequestConfig | undefined =
      token != null
        ? {
            headers: {
              authorization: `Bearer ${token}`,
            },
          }
        : undefined;
    json = (await robustGet(downloadLink, cfg)).unwrap();
  } catch (e) {
    console.log(JSON.stringify(e));
    return new Err(`Error:Can't fetch ${downloadLink}`);
  }
  if (!Array.isArray(json) || json[0] == null) {
    return new Err(`Error:GitHub api response is not an array : ${json}`);
  }
  try {
    let i = 0;
    //过滤预发布
    while (json[i]?.prerelease && i < json.length) {
      i++;
    }
    //防止越界
    if (i == json.length) {
      i = 0;
    }
    const version = json[i].tag_name;
    return new Ok({
      version,
      downloadLink,
    });
  } catch (e) {
    return new Err(
      `Error:Abnormal GitHub api response at task ${
        p.taskName
      } : ${JSON.stringify(e, null, 2)}`,
    );
  }
}
