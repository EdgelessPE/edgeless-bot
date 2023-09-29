import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";

export default async function (): Promise<Result<ScraperReturned, string>> {
  return new Ok({
    version: "0.0.0",
    downloadLink:
      "https://cdn.aliyundrive.net/downloads/apps/desktop/aDrive.exe",
  });
}
