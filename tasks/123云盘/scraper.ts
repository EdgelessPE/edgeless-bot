import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";

export default async function (): Promise<Result<ScraperReturned, string>> {
  const versionApi: any = (
    await robustGet("https://www.123pan.com/api/version_upgrade", {
      responseType: "json",
      headers: {
        platform: "pc",
      },
    })
  ).unwrap();
  console.log(versionApi);
  const versionUrl = `${
    versionApi.data.url
  }/latest.yml?noCache=${Math.random()}`;
  const versionInfo: any = (await robustGet(versionUrl)).unwrap() as string;
  const version = versionInfo.match(/version: (.+)/)[1];
  const downloadLink = `${versionApi.data.url}/${
    versionInfo.match(/url: (.+)/)[1]
  }`;
  return new Ok({
    version,
    downloadLink,
  });
}
