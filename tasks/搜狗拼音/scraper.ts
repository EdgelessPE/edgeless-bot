import { Err, Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";
import { log } from "../../src/utils";

const reg = /https?:\/\/ime\.sogouimecdn\.com\/[^\s"'<>]+\.exe/;

export default async function (): Promise<Result<ScraperReturned, string>> {
  // 获取官网首页
  const page = (
    await robustGet("https://pinyin.sogou.com/windows/?r=mac&t=pinyin")
  ).unwrap() as string;
  // 匹配下载链接
  const m = page.match(reg);
  if (m == null) {
    return new Err("Error:Can't match url");
  }
  const url = m[0];
  log(`Info:Matched url ${url}`);

  // 从 URL 中提取版本号
  const versionMatch = url.match(/sogou_pinyin_([\d.]+)\.exe/);
  if (versionMatch == null) {
    return new Err("Error:Can't match version from url");
  }
  const version = versionMatch[1];
  log(`Info:Matched version ${version}`);

  return new Ok({
    version,
    downloadLink: url,
  });
}
