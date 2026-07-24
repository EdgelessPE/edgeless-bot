import { Err, Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";

const API_BASE = "https://mobilebasedata.kuwo.cn/api/sl/web/down_pc?pack=";
const CHANNELS = ["web_1", "web_2", "web_6"];

type KuwoFetcher = (url: string) => Promise<Result<unknown, string>>;

function extractKuwoDownloadUrl(payload: any): string {
  const url = payload?.data?.url;
  if (typeof url !== "string" || url === "") {
    throw new Error("Invalid Kuwo download payload");
  }
  return url;
}

function fetchKuwoPayload(url: string): Promise<Result<unknown, string>> {
  return robustGet(url, {
    headers: {
      Referer: "https://www.kuwo.cn/down",
    },
  });
}

async function fetchKuwoDownloadUrl(
  fetcher: KuwoFetcher = fetchKuwoPayload,
): Promise<Result<string, string>> {
  for (const channel of CHANNELS) {
    const payloadRes = await fetcher(`${API_BASE}${channel}`);
    if (payloadRes.err) {
      continue;
    }
    try {
      return new Ok(extractKuwoDownloadUrl(payloadRes.val));
    } catch {
      continue;
    }
  }

  return new Err(
    `Error:Can't fetch Kuwo download URL from ${CHANNELS.join(", ")}`,
  );
}

export default async function (): Promise<Result<ScraperReturned, string>> {
  const downloadUrlRes = await fetchKuwoDownloadUrl();
  if (downloadUrlRes.err) {
    return new Err(downloadUrlRes.val);
  }

  return new Ok({
    downloadLink: downloadUrlRes.val,
    version: "0.0.0",
  });
}

export { extractKuwoDownloadUrl, fetchKuwoDownloadUrl };
