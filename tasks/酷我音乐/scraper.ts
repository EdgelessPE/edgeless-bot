import type { ScraperReturned } from "../../src/class";
import { Ok, type Result } from "ts-results";

export default async function (): Promise<Result<ScraperReturned, string>> {
  return new Ok({
    downloadLink: "http://down.kuwo.cn/mbox/KwMusicSetup_bd.exe",
    version: "0.0.0",
  });
}
