import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";

export default async function (): Promise<Result<ScraperReturned, string>> {
  // 请求官网
  const page = (await robustGet("https://www.u.tools/")).unwrap() as string;
  // 匹配publishURL
  const pum = page.match(/publishURL\s*=\s*'http\S*/) as RegExpMatchArray;
  const publishURL = pum[0].split("'")[1];
  // 匹配package
  const pm = page.match(/uTools-\d*\.\d*\.\d*\.exe/) as RegExpMatchArray;
  const name = pm[0];
  const downloadLink = publishURL + name;
  // 匹配版本号
  const vm = name.match(/\d*\.\d*\.\d*/) as RegExpMatchArray;
  const version = vm[0];

  return new Ok({
    version,
    downloadLink,
  });
}
