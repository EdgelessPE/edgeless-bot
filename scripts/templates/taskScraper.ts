import { Ok, Err, Result } from "ts-results";
import { ScraperReturned } from "../../src/types/class";
import { robustGet } from "../../src/network";
import { log } from "../../src/utils";
import * as cheerio from "cheerio";

export default async function (): Promise<Result<ScraperReturned, string>> {
  const html = (await robustGet("http://localhost")).unwrap() as string;
  const $ = cheerio.load(html);

  //YOUR CODE HERE

  return new Ok({
    version: "0.0.0",
    downloadLink: "http://localhost/file.exe",
  });
}
