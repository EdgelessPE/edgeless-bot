import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";

export default async function (): Promise<Result<ScraperReturned, string>> {
  const versionApi: any = (
    await robustGet("https://www.aliyundrive.com/desktop/version/update.json", {
      responseType: "json",
    })
  ).unwrap();
  const versionUrl = `${
    versionApi.url
  }/win32/x64/latest.yml?noCache=${Math.random()}`;
  const versionInfo: any = (await robustGet(versionUrl)).unwrap() as string;
  const version = versionInfo.match(/version: (.+)/)[1];
  const downloadLink = versionInfo.match(/url: (.+)/)[1];
  return new Ok({
    version,
    downloadLink,
  });
}
