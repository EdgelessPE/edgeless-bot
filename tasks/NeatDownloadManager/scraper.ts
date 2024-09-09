import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/types/class";
import { robustGet } from "../../src/utils/network";
import * as cheerio from "cheerio";

export default async function (): Promise<Result<ScraperReturned, string>> {
  const pageRes = await robustGet(
    "https://www.neatdownloadmanager.com/index.php/en/",
  );
  if (pageRes.err) return pageRes;
  const $ = cheerio.load(pageRes.unwrap() as string);

  // YOUR CODE HERE
  const version: string = (/(\d\.\d)/.exec(
    $("#dima_2_2 > div > p.p1").text() as string,
  ) ?? [""])[0];

  return new Ok({
    version: version,
    downloadLink: "https://www.neatdownloadmanager.com/file/NeatDM_setup.exe",
  });
}
