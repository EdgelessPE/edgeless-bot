import { Err, Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet, robustParseRedirect } from "../../src/network";
import * as cheerio from "cheerio";

const DOWNLOAD_PAGE =
  "https://learn.microsoft.com/en-us/windows/apps/windows-sdk/downloads";
const DEBUGGER_MSI = "X64 Debuggers And Tools-x64_en-us.msi";

export default async function (): Promise<Result<ScraperReturned, string>> {
  const pageRes = await robustGet(DOWNLOAD_PAGE);
  if (pageRes.err || typeof pageRes.val !== "string") {
    return new Err("Error:Can't fetch Windows SDK download page");
  }

  const $ = cheerio.load(pageRes.val);
  let version: string | undefined, installerLink: string | undefined;
  for (const row of $("main table").first().find("tr").toArray()) {
    const versionMatch = $(row)
      .text()
      .match(/Windows SDK for Windows 11 \((\d+\.\d+\.\d+\.\d+)\)/);
    const installer = $(row)
      .find("a")
      .toArray()
      .find((link) => $(link).text().trim() === "Installer");
    if (versionMatch && installer) {
      version = versionMatch[1];
      installerLink = $(installer).attr("href");
      break;
    }
  }
  if (!version || !installerLink) {
    return new Err("Error:Can't find latest stable Windows SDK installer");
  }

  const installerUrl = new URL(installerLink, DOWNLOAD_PAGE).toString();
  const redirectRes = await robustParseRedirect(installerUrl);
  if (redirectRes.err) return redirectRes;

  const directUrl = new URL(redirectRes.val);
  if (
    directUrl.protocol !== "https:" ||
    directUrl.hostname !== "download.microsoft.com" ||
    !directUrl.pathname.toLowerCase().endsWith("/winsdksetup.exe")
  ) {
    return new Err("Error:Windows SDK installer redirected to an invalid URL");
  }

  return new Ok({
    version,
    downloadLink: new URL(
      `Installers/${encodeURIComponent(DEBUGGER_MSI)}`,
      directUrl,
    ).toString(),
  });
}
