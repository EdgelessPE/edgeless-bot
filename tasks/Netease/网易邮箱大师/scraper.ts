import { ScraperReturned } from "@/types/class";
import { Ok, Result } from "ts-results";

export default async function (): Promise<Result<ScraperReturned, string>> {
  // YOUR CODE HERE

  return new Ok({
    version: "0.0.0",
    downloadLink: "https://u.163.com/pcds",
  });
}
