// / <reference path="Scoop.d.ts" />

import { Err, Ok, Result } from "ts-results";
import { ScraperParameters, ScraperReturned } from "../../src/types/class";
import { log } from "../../src/utils";
import { robustGet } from "../../src/utils/network";
import { ScoopAppManifestSchema } from "./ScoopTypes";

interface Temp {}

export default async function (
  p: ScraperParameters,
): Promise<Result<ScraperReturned, string>> {
  const rawUrl = p.url.replace("/blob/", "/raw/");
  const res = await robustGet<ScoopAppManifestSchema>(rawUrl, {
    responseType: "json",
  });
  if (res.err) return res;
  const response = res.unwrap();
  try {
    log(
      `Info: downloadLink:${
        response.architecture?.["64bit"]?.url ?? response.url
      }`,
    );
    log(`Info: Version: ${response["version"]}`);
    const downloadLink = response.architecture?.["64bit"]?.url ?? response.url;
    if (typeof downloadLink !== "string") {
      return new Err(
        `Error:Download url is not a string, got : '${downloadLink}'`,
      );
    }
    if (downloadLink) {
      return new Ok({
        version: response["version"],
        downloadLink,
      });
    } else {
      return new Err("Error:No url given in scoop manifest");
    }
  } catch (e) {
    return new Err(
      `Error:Given url doesn't match standard scoop manifest schema, got : ${JSON.stringify(
        response,
      )}, error : ${JSON.stringify(e)}`,
    );
  }
}
