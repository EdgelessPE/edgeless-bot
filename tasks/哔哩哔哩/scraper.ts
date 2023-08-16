import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/types/class";
import { robustGet } from "../../src/network";
import { Cmp, matchVersion, versionCmp } from "../../src/utils";

export default async function (): Promise<Result<ScraperReturned, string>> {
  // YOUR CODE HERE

  // 请求版本号接口
  const res = await robustGet(
    "https://app.bilibili.com/x/v2/version?mobi_app=pc_client",
  );
  const arr = (res.unwrap() as any).data.map((n: any) => n.version);

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
