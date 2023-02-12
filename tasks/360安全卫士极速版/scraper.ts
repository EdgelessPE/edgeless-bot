import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/types/class";

export default async function (): Promise<Result<ScraperReturned, string>> {
  return new Ok({
    version: "0.0.0",
    downloadLink: "https://down.360safe.com/setupbeta_jisu.exe",
  });
}
