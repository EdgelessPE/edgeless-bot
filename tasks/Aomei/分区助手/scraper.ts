import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/types/class";

export default async function (): Promise<Result<ScraperReturned, string>> {
  return new Ok({
    downloadLink: "https://www2.aomeisoftware.com/download/pacn/PAWinPEx64.7z",
    version: "0.0.0",
  });
}
