import { ScraperParameters, ScraperReturned } from "@/types/class";
import { log } from "@/utils";
import { robustGet } from "@/utils/network";
import * as cheerio from "cheerio";
import { Err, Ok, Result } from "ts-results";

interface Temp {}

export default async function (
  p: ScraperParameters,
): Promise<Result<ScraperReturned, string>> {
  const { taskName, url, downloadLinkRegex, versionMatchRegex, scraper_temp } =
    p;
  const temp = p.scraper_temp as Temp;
  const html = (await robustGet(url)).unwrap() as string;
  const $ = cheerio.load(html);

  //YOUR CODE HERE

  return new Ok({
    version: "0.0.0",
    downloadLink: "http://localhost/file.exe",
  });
}
