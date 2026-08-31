import { Err, Ok, Result } from "ts-results";
import { ScraperParameters, ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";
import { Cmp, log, matchUrl, matchVersion, versionCmp } from "../../src/utils";
import * as cheerio from "cheerio";
import { AxiosRequestConfig } from "axios";

interface Temp {
  version_page_url?: string;
  download_page_url?: string;
  version_selector?: string;
  download_selector?: string;
  ua?: string;
}

export default async function (
  p: ScraperParameters,
): Promise<Result<ScraperReturned, string>> {
  const temp: Temp = p.scraper_temp || {};
  const vm = p.versionMatchRegex
      ? new RegExp(p.versionMatchRegex, "g")
      : /(\d+\.)+\d+/g,
    dm = p.downloadLinkRegex
      ? new RegExp(p.downloadLinkRegex, "g")
      : // eslint-disable-next-line no-useless-escape
        /(https?:)*\/?\/[\w.-/\-]+\.exe/g;
  // 生成 Axios Config
  const axiosCfg: AxiosRequestConfig | undefined = temp.ua
    ? { headers: { "User-Agent": temp.ua } }
    : undefined;
  // 获取页面
  let page, scope;
  const getRes = await robustGet(temp.version_page_url ?? p.url, axiosCfg);
  if (getRes.err || getRes.val == null || getRes.val == "") {
    return new Err(`Error:Fetched null page`);
  } else {
    page = getRes.val as string;
  }
  // 全局匹配版本号
  // 处理定义的选择器
  if (temp.version_selector != undefined) {
    const $ = cheerio.load(page);
    scope = $(temp.version_selector).html() ?? "";
    log(`Info:Narrow version match scope by selector : ${scope}`);
  } else {
    scope = page;
  }
  let m = scope.match(vm);
  if (m == null) {
    return new Err("Error:Given version match regex matched nothing");
  }
  log(
    `Info:Version match result : ${m.toString()}${
      m.length > 1 ? ", use the highest one" : ""
    }`,
  );
  let version = "0.0.0",
    tmp;
  for (const node of m) {
    tmp = matchVersion(node);
    if (tmp.err) {
      continue;
    }
    if (versionCmp(tmp.val, version) == Cmp.G) {
      version = tmp.val;
    }
  }
  if (version == "0.0.0") {
    return new Err("Error:Given version match regex matched no version string");
  }

  // 全局匹配下载地址
  if (temp.download_page_url != undefined) {
    page = (
      await robustGet(temp.download_page_url, axiosCfg)
    ).unwrap() as string;
  }
  if (
    temp.download_page_url == undefined &&
    temp.version_page_url != undefined
  ) {
    page = (await robustGet(p.url, axiosCfg)).unwrap() as string;
  }
  // 处理定义的选择器
  let skipMatch = false;
  if (temp.download_selector != undefined) {
    const $ = cheerio.load(page),
      href = $(temp.download_selector).attr("href");
    if (href) {
      scope = href;
      skipMatch = true;
    } else {
      scope = $(temp.download_selector).html() ?? "";
    }
    log(`Info:Narrow download match scope by selector : ${scope}`);
  } else {
    scope = page;
  }
  let downloadLink;
  if (!skipMatch) {
    m = scope.match(dm);
    if (m == null) {
      return new Err("Error:Given download link match regex matched nothing");
    }
    if (m.length > 1) {
      log(
        `Warning:Matched multiple outcomes : ${m.toString()}, use the first one, consider modify regex.downloadLinkRegex`,
      );
    }
    downloadLink = m[0];
  } else {
    downloadLink = scope;
  }
  log(`Info:Download link match result : ${downloadLink}`);

  // 处理以 / 开头的下载地址
  if (downloadLink[0] == "/" && downloadLink[1] != "/") {
    downloadLink =
      new URL(temp.download_page_url ?? p.url).origin + downloadLink;
  }

  // 数据清洗
  const clearVersionRes = matchVersion(version);
  if (clearVersionRes.ok) {
    version = clearVersionRes.val;
  }
  const downloadLinkRes = matchUrl(downloadLink);
  if (downloadLinkRes.ok) {
    downloadLink = downloadLinkRes.val;
  }

  return new Ok({
    version,
    downloadLink,
  });
}
