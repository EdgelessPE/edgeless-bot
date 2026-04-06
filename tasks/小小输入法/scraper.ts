import * as cheerio from "cheerio";
import { Err, Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";
import { Cmp, versionCmp } from "../../src/utils";

const DOWNLOAD_PAGE = "https://yong.dgod.net/download/";
const WINDOWS_ARCHIVE_REGEX = /yong-lin-(\d{4})(\d{2})(\d{2})\.7z$/i;

function formatYongVersion(downloadLink: string): string {
  const matchRes = downloadLink.match(WINDOWS_ARCHIVE_REGEX);
  if (matchRes == null) {
    throw new Error(`Invalid Yong archive link: ${downloadLink}`);
  }
  const [, year, month, day] = matchRes;
  return `${year}.${Number(month)}.${Number(day)}`;
}

function selectLatestArchive(page: string, pageUrl: string): string {
  const $ = cheerio.load(page);
  let latestLink = "",
    latestVersion = "0.0.0";

  $("a[href]").each((_index, node) => {
    const href = $(node).attr("href");
    if (href == null) {
      return;
    }
    const absoluteUrl = new URL(href, pageUrl).toString();
    if (absoluteUrl.match(WINDOWS_ARCHIVE_REGEX) == null) {
      return;
    }
    const version = formatYongVersion(absoluteUrl);
    if (versionCmp(version, latestVersion) === Cmp.G) {
      latestVersion = version;
      latestLink = absoluteUrl;
    }
  });

  if (latestLink === "") {
    throw new Error("No Windows archive link found");
  }
  return latestLink;
}

export default async function (): Promise<Result<ScraperReturned, string>> {
  const pageRes = await robustGet(DOWNLOAD_PAGE);
  if (pageRes.err || typeof pageRes.val !== "string") {
    return new Err(`Error:Can't fetch ${DOWNLOAD_PAGE}`);
  }

  try {
    const downloadLink = selectLatestArchive(pageRes.val, DOWNLOAD_PAGE);
    return new Ok({
      version: formatYongVersion(downloadLink),
      downloadLink,
    });
  } catch (error) {
    return new Err(`Error:${(error as Error).message}`);
  }
}

export { formatYongVersion, selectLatestArchive };
