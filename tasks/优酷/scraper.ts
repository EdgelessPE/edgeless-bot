import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";

export default async function (): Promise<Result<ScraperReturned, string>> {
  const prefix = "https://pcclient.download.youku.com/iku-win-release/";
  const versionUrl = `${prefix}latest.yml?noCache=${Math.random()}`;
  const versionInfo: any = (await robustGet(versionUrl)).unwrap() as string;
  const version = versionInfo.match(/version: (.+)/)[1];
  const downloadLink = prefix + versionInfo.match(/url: (.+)/)[1];
  return new Ok({
    version,
    downloadLink,
  });
}
