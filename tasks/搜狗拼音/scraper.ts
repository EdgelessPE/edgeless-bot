import { Err, Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";
import { log, versionCmp, Cmp } from "../../src/utils";

const reg =
  /https:\/\/ime-sec.gtimg.com\/[0-9]+\/\w+\/pc\/dl\/gzindex\/[0-9]+\/sogou_pinyin_[\w.]+.exe/;

export default async function (): Promise<Result<ScraperReturned, string>> {
  let version = "0.0";
  // 获取官网首页
  const page = (
    await robustGet("https://pinyin.sogou.com/windows/?r=mac&t=pinyin")
  ).unwrap() as string;
  // 匹配页面json数据
  const m = page.match(reg);
  if (m == null) {
    return new Err("Error:Can't match url");
  }
  const url = m[0];
  log(`Info:Matched url ${url}`);

  // 获取升级日志页面
  const versionPage = (
    await robustGet("https://pinyin.sogou.com/changelog.php")
  ).unwrap() as string;
  // 匹配所有的正式版发布信息
  // console.log(gb2312(page.data))
  const matches = versionPage.match(/\d*\.\d*\S*<\/h2>/) as RegExpMatchArray;
  // 获取其中最高的版本号
  let match;
  matches.forEach((item) => {
    // 提取版本号
    match = item.match(/\d*\.\d*/);
    if (match && versionCmp(version, match[0]) == Cmp.L) {
      version = match[0];
    }
  });
  log(`Info:Matched version ${version}`);

  return new Ok({
    version,
    downloadLink: url,
  });
}
