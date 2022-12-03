import { Ok, Err, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";
import { log, versionCmp, matchVersion, Cmp } from "../../src/utils";
import cheerio from "cheerio";

export default async function (): Promise<Result<ScraperReturned, string>> {
  //YOUR CODE HERE

  //请求版本号接口
  const res = await robustGet(
    "https://app.bilibili.com/x/v2/version?mobi_app=html5_mobile"
  );
  const arr = (res.unwrap() as any).data.map((n: any) => n.version);

  //匹配最大版本号
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
