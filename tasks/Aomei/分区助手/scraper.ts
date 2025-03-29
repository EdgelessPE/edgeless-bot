import { ScraperReturned } from "@/types/class";
import { Ok, Result } from "ts-results";

export default async function (): Promise<Result<ScraperReturned, string>> {
  return new Ok({
    downloadLink: "https://www2.aomeisoftware.com/download/pacn/PAWinPEx64.7z",
    version: "0.0.0",
  });
}
