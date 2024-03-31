import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";
import { matchVersion } from "../../src/utils";

export default async function (): Promise<Result<ScraperReturned, string>> {
  // 请求官网
  const page = (await robustGet("https://www.u.tools/")).unwrap() as string;
  // 匹配publishURL
  const pum = page.match(/publishURL\s*=\s*'http\S*/) as RegExpMatchArray;
  const publishURL = pum[0].split("'")[1];
  // 匹配版本号
  const vm = page.match(/version\s*=\s*'\d*\.\d*\.\d*'/) as RegExpMatchArray;
  const version = matchVersion(vm[0]).unwrap();
  // 拼接下载链接
  const downloadLink = publishURL + "uTools-" + version + ".exe";

  return new Ok({
    version,
    downloadLink,
  });
}
