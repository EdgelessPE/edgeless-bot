import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/types/class";

export default async function (): Promise<Result<ScraperReturned, string>> {
  return new Ok({
    downloadLink: "https://down.kuwo.cn/mbox/kwmusic_web_4.exe",
    version: "0.0.0",
  });
}
