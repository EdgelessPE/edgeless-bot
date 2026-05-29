import { Err, Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";
import { log } from "../../src/utils";

const DOWNLOAD_PAGE = "https://pinyin.sogou.com/";
const DOWNLOAD_CONFIG_REGEX = /"downloadConfig":"((?:\\.|[^"\\])*)"/;
const WINDOWS_INSTALLER_REGEX = /^https?:\/\/[^\s"'<>]+\.exe$/;

interface SogouDownloadConfig {
  windows?: {
    normal?: string;
    baidu?: string;
  };
}

function parseDownloadConfig(page: string): SogouDownloadConfig {
  const matchRes = page.match(DOWNLOAD_CONFIG_REGEX);
  if (matchRes == null) {
    throw new Error("Can't match download config");
  }
  const configText = JSON.parse(`"${matchRes[1]}"`) as string;
  return JSON.parse(configText) as SogouDownloadConfig;
}

function selectWindowsInstaller(page: string): string {
  const downloadLink = parseDownloadConfig(page).windows?.normal;
  if (
    downloadLink == null ||
    downloadLink.match(WINDOWS_INSTALLER_REGEX) == null
  ) {
    throw new Error("Can't match url");
  }
  return downloadLink;
}

function parseSogouVersion(downloadLink: string): string {
  const matchRes = downloadLink.match(/pinyin_guanwang_(\d+(?:\.\d+)+)/);
  if (matchRes == null) {
    throw new Error("Can't match version from url");
  }
  return matchRes[1];
}

export default async function (): Promise<Result<ScraperReturned, string>> {
  const pageRes = await robustGet(DOWNLOAD_PAGE);
  if (pageRes.err || typeof pageRes.val !== "string") {
    return new Err(`Error:Can't fetch ${DOWNLOAD_PAGE}`);
  }

  try {
    const url = selectWindowsInstaller(pageRes.val);
    log(`Info:Matched url ${url}`);

    const version = parseSogouVersion(url);
    log(`Info:Matched version ${version}`);

    return new Ok({
      version,
      downloadLink: url,
    });
  } catch (error) {
    return new Err(`Error:${(error as Error).message}`);
  }
}

export { parseDownloadConfig, parseSogouVersion, selectWindowsInstaller };
