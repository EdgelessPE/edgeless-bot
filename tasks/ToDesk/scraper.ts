import * as cheerio from "cheerio";
import { Err, Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";

const DOWNLOAD_PAGE = "https://www.todesk.com/solo";
const WINDOWS_INSTALLER_REGEX =
  /https:\/\/dl\.todesk\.com\/irrigation\/ToDesk_(\d+\.\d+\.\d+\.\d+)\.exe/i;

function parseToDeskVersion(downloadLink: string): string {
  const matchRes = downloadLink.match(WINDOWS_INSTALLER_REGEX);
  if (matchRes == null) {
    throw new Error(`Invalid ToDesk download link: ${downloadLink}`);
  }
  return matchRes[1];
}

function selectWindowsInstaller(page: string): string {
  const $ = cheerio.load(page);
  const installer = $(
    "a[href*='dl.todesk.com/irrigation/ToDesk_'][href$='.exe']",
  )
    .filter((_index, node) => $(node).css("display") !== "none")
    .first()
    .attr("href");

  if (installer == null || !WINDOWS_INSTALLER_REGEX.test(installer)) {
    throw new Error("No Windows installer link found");
  }
  return installer;
}

export default async function (): Promise<Result<ScraperReturned, string>> {
  const pageRes = await robustGet(DOWNLOAD_PAGE);
  if (pageRes.err || typeof pageRes.val !== "string") {
    return new Err(`Error:Can't fetch ${DOWNLOAD_PAGE}`);
  }

  try {
    const downloadLink = selectWindowsInstaller(pageRes.val);
    return new Ok({
      version: parseToDeskVersion(downloadLink),
      downloadLink,
    });
  } catch (error) {
    return new Err(`Error:${(error as Error).message}`);
  }
}

export { parseToDeskVersion, selectWindowsInstaller };
