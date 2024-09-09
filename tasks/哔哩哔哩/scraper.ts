import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/types/class";
import { robustGet } from "../../src/utils/network";
import { Cmp, matchVersion, versionCmp } from "../../src/utils";

interface Data {
  code: number;
  message: string;
  ttl: number;
  data: {
    plat: number;
    desc: string;
    version: string;
    build: number;
    ptime: number;
  }[];
}

export default async function (): Promise<Result<ScraperReturned, string>> {
  // YOUR CODE HERE

  // 请求版本号接口
  const res = await robustGet<Data>(
    "https://app.bilibili.com/x/v2/version?mobi_app=pc_client",
  );
  if (res.err) return res;
  const arr = res.unwrap().data.map((n) => n.version);

  // 匹配最大版本号
  let maxVersion = "0.0.0",
    cur;
  for (const text of arr) {
    cur = matchVersion(text).unwrapOr("0.0.0");
    if (versionCmp(maxVersion, cur) == Cmp.L) {
      maxVersion = cur;
    }
  }

  return new Ok({
    version: maxVersion,
    downloadLink:
      "https://dl.hdslb.com/mobile/fixed/bili_win/bili_win-install.exe",
  });
}
