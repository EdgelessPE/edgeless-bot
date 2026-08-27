import { Err, Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";

const VERSION_API_URLS = [
  "https://api.trae.cn/icube/api/v1/native/version/trae/cn/latest",
  "https://api.trae.ai/icube/api/v1/native/version/trae/cn/latest",
];

interface DownloadItem {
  region?: string;
  x64?: string;
}

interface VersionPayload {
  data?: {
    solo?: {
      win32?: {
        download?: DownloadItem[];
      };
    };
  };
}

type TraeFetcher = (url: string) => Promise<Result<unknown, string>>;

function parseTraeWorkPayload(payload: unknown): ScraperReturned {
  const downloadItems = (payload as VersionPayload)?.data?.solo?.win32
    ?.download;
  if (!Array.isArray(downloadItems)) {
    throw new Error("Invalid TraeWork version payload");
  }

  // 优先使用中国大陆 CDN，接口顺序变化时再回退到首个可用链接
  const downloadLink =
    downloadItems.find((item) => item.region === "cn" && item.x64)?.x64 ??
    downloadItems.find((item) => typeof item.x64 === "string")?.x64;
  if (downloadLink == null) {
    throw new Error("No TraeWork Windows x64 download link found");
  }

  const versionMatch = downloadLink.match(/\/releases\/stable\/([^/]+)\//);
  if (versionMatch == null) {
    throw new Error(`Invalid TraeWork download link: ${downloadLink}`);
  }

  return {
    version: versionMatch[1],
    downloadLink,
  };
}

async function fetchTraeWork(
  fetcher: TraeFetcher = robustGet,
): Promise<Result<ScraperReturned, string>> {
  for (const url of VERSION_API_URLS) {
    const payloadRes = await fetcher(url);
    if (payloadRes.err) {
      continue;
    }

    try {
      return new Ok(parseTraeWorkPayload(payloadRes.val));
    } catch {
      continue;
    }
  }

  return new Err("Error:Can't fetch a valid TraeWork Windows release");
}

export default async function (): Promise<Result<ScraperReturned, string>> {
  return fetchTraeWork();
}

export { fetchTraeWork, parseTraeWorkPayload };
