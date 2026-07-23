import { Err, Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";

export default async function (): Promise<Result<ScraperReturned, string>> {
  const downloadPage = (
    await robustGet("https://www.alipan.com/download")
  ).unwrap() as string;
  const linkMatch = downloadPage.match(
    /app_windows_download_link:\s*["'](https:\/\/[^"']+\/aDrive-([\d.]+)\.exe)["']/,
  );
  if (linkMatch?.[1] === undefined || linkMatch[2] === undefined) {
    return new Err("Error:Can't find Aliyun Drive Windows download link");
  }
  return new Ok({
    version: linkMatch[2],
    downloadLink: linkMatch[1],
  });
}
