import { Err, Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";

const API_URL = "https://mobilebasedata.kuwo.cn/api/sl/web/down_pc?pack=web_1";

function extractKuwoDownloadUrl(payload: any): string {
  const url = payload?.data?.url;
  if (typeof url !== "string" || url === "") {
    throw new Error("Invalid Kuwo download payload");
  }
  return url;
}

export default async function (): Promise<Result<ScraperReturned, string>> {
  const payloadRes = await robustGet(API_URL, {
    headers: {
      Referer: "https://www.kuwo.cn/down",
    },
  });
  if (payloadRes.err) {
    return new Err(`Error:Can't fetch ${API_URL}`);
  }

  try {
    return new Ok({
      downloadLink: extractKuwoDownloadUrl(payloadRes.val),
      version: "0.0.0",
    });
  } catch (error) {
    return new Err(`Error:${(error as Error).message}`);
  }
}

export { extractKuwoDownloadUrl };
