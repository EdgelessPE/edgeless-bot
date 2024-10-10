import { Ok, Err, Result } from "ts-results";
import { ScraperParameters, ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";
import { log } from "../../src/utils";

// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type
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
    const url = response.architecture?.["64bit"]?.url ?? response.url;
    const downloadLink = url.split("#/")[0];
    const version = response.version;
    log(`Info: downloadLink:${downloadLink}`);
    log(`Info: Version: ${version}`);
    return new Ok({ version, downloadLink });
  } catch (e) {
    return new Err(
      `Error:Given url doesn't match standard scoop manifest schema, got : ${JSON.stringify(
        response,
      )}, error : ${JSON.stringify(e)}`,
    );
  }
}
