import { ScraperReturned } from "@/types/class";
import { log } from "@/utils";
import { robustGet } from "@/utils/network";
import * as cheerio from "cheerio";
import { Err, Ok, Result } from "ts-results";

export default async function (): Promise<Result<ScraperReturned, string>> {
  const html = (await robustGet("http://localhost")).unwrap() as string;
  const $ = cheerio.load(html);

  //YOUR CODE HERE

  return new Ok({
    version: "0.0.0",
    downloadLink: "http://localhost/file.exe",
  });
}
