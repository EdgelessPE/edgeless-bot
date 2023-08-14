import { Err, Ok, Result } from "ts-results";
import { ScraperParameters, ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";

interface Temp {
  api_url: string;
  version_path: string;
  download_path: string;
  referer?: string;
}

function objChainReader(obj: any, chain: string[]): Result<any, string> {
  if (!(chain[0] in obj)) {
    return new Err(`Error:Key undefined`);
  }
  //当chain数组大于1时进行递归
  if (chain.length > 1) {
    return objChainReader(obj[chain[0]], chain.slice(1));
  } else {
    const res = obj[chain[0]];
    if (Array.isArray(res)) {
      return new Ok(res.join("."));
    }
    return new Ok(res);
  }
}

export default async function (
  p: ScraperParameters,
): Promise<Result<ScraperReturned, string>> {
  //发送请求
  const temp = p.scraper_temp as Temp;
  const jsonRes = await robustGet(
    temp.api_url,
    temp.referer == undefined
      ? undefined
      : {
          headers: {
            Referer: temp.referer,
          },
        },
  );
  if (jsonRes.err) {
    return jsonRes;
  }
  let json = jsonRes.unwrap();
  //尝试读取json
  const versionReadRes = objChainReader(json, temp.version_path.split(".")),
    linkReadRes = objChainReader(json, temp.download_path.split("."));
  if (typeof json == "string") {
    json = JSON.parse(json);
  }
  if (versionReadRes.err) {
    return new Err(
      `Error:Can't find key ${
        temp.version_path
      } in this json :\n${JSON.stringify(json, null, 2)}`,
    );
  }
  if (linkReadRes.err) {
    return new Err(
      `Error:Can't find key ${
        temp.download_path
      } in this json :\n${JSON.stringify(json, null, 2)}`,
    );
  }

  return new Ok({
    version: versionReadRes.val,
    downloadLink: linkReadRes.val,
  });
}
