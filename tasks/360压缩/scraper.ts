import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";

export default async function (): Promise<Result<ScraperReturned, string>> {
  return new Ok({
    version: "0.0.0",
    downloadLink: "https://dl.360safe.com/360zip_setup.exe",
  });
}
