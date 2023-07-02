import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";

export default async function (): Promise<Result<ScraperReturned, string>> {
  return new Ok({
    downloadLink: "https://down.kuwo.cn/mbox/kwmusic_web_6.exe",
    version: "0.0.0",
  });
}
