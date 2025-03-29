import { ScraperParameters, ScraperReturned } from "@/types/class";
import { log } from "@/utils";
import { robustParseRedirect } from "@/utils/network";
import { Err, Ok, Result } from "ts-results";

interface Temp {
  redirection_url: string;
}

export default async function (
  p: ScraperParameters,
): Promise<Result<ScraperReturned, string>> {
  const temp = p.scraper_temp as Temp;
  // 解析直链
  const downloadLink = (
    await robustParseRedirect(temp.redirection_url)
  ).unwrap();
  // 匹配版本号
  const m = downloadLink.match(p.versionMatchRegex ?? /(\d+\.)+\d+/g);
  if (m == null) {
    return new Err(`Error:Can't match version with ${downloadLink}`);
  }
  if (m.length > 1) {
    log("Warning:Matched multi version string, using the last one");
  }

  return new Ok({
    version: m[m.length - 1],
    downloadLink,
  });
}
