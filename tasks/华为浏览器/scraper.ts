import { load } from "cheerio";
import { Err, Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";

const DOWNLOAD_PAGE = "https://consumer.huawei.com/cn/mobileservices/browser/";
const NAV_SCRIPT_REGEX = /\/nav(?:-v\d+)?\.js(?:[?#]|$)/;
// 只匹配生效的 x64 下载地址，跳过单行注释里的旧链接和 ARM64 安装包。
const INSTALLER_REGEX =
  /^[ \t]*\w+\.attr\(["']href["'],\s*["']([^"'\s]*\/HuaweiBrowser-(\d+(?:\.\d+)+)-signed\.exe)["']\)/m;

export default async function (): Promise<Result<ScraperReturned, string>> {
  const pageRes = await robustGet(DOWNLOAD_PAGE);
  if (pageRes.err || typeof pageRes.val !== "string") {
    return new Err(`Error:Can't fetch ${DOWNLOAD_PAGE}`);
  }

  const $ = load(pageRes.val);
  const script = $('script[src*="/browser/"]')
    .toArray()
    .map((node) => $(node).attr("src"))
    .find((src) => src && NAV_SCRIPT_REGEX.test(src));
  if (!script) {
    return new Err("Error:Can't find Huawei Browser navigation script");
  }

  const scriptUrl = new URL(script, DOWNLOAD_PAGE);
  const scriptRes = await robustGet(scriptUrl.href);
  if (scriptRes.err || typeof scriptRes.val !== "string") {
    return new Err(`Error:Can't fetch ${scriptUrl.href}`);
  }

  const match = scriptRes.val.match(INSTALLER_REGEX);
  if (!match) {
    return new Err("Error:Can't match Huawei Browser x64 installer URL");
  }

  const [, installer, version] = match;
  return new Ok({
    version,
    downloadLink: new URL(installer, DOWNLOAD_PAGE).href,
  });
}
