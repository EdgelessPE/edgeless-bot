import { Ok, Err, Result } from "ts-results";
import { ScraperParameters, ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";
import { log } from "../../src/utils";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Temp {}

export default async function (
  p: ScraperParameters,
): Promise<Result<ScraperReturned, string>> {
  const rawUrl = p.url.replace("/blob/", "/raw/");

  const response: any = (
    await robustGet(rawUrl, {
      responseType: "json",
    })
  ).unwrap();
  try {
    log(
      `Info: downloadLink:${
        response["architecture"]?.["64bit"]["url"] ?? response["url"]
      }`,
    );
    log(`Info: Version: ${response["version"]}`);
    return new Ok({
      version: response["version"],
      downloadLink:
        response["architecture"]?.["64bit"]["url"] ?? response["url"],
    });
  } catch (e) {
    return new Err(
      `Error:Given url doesn't match standard scoop manifest schema, got : ${JSON.stringify(
        response,
      )}, error : ${JSON.stringify(e)}`,
    );
  }
}
