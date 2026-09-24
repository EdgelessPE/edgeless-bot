import { Err, Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";

const DOWNLOAD_CONFIG_API =
  "https://cache.wuji.qq.com/x/api/wuji_cache/object?appid=vqqcom&schemaid=downloadpage_config&schemakey=5dbbd3491a7342ad9bd2ed9bc098484a&filter=isShow%3Dtrue";

interface DownloadItem {
  app?: string;
  isShow?: boolean;
  version?: string;
  downloadLink?: string;
  downloadLinkFor64?: string;
}

interface DownloadConfigPayload {
  code?: number;
  data?: DownloadItem[];
}

function parseTencentVideoPayload(payload: unknown): ScraperReturned {
  const response = payload as DownloadConfigPayload;
  const windows = response.data?.find(
    (item) => item.isShow === true && item.app === "Windows",
  );
  if (response.code !== 200 || windows == null) {
    throw new Error("No visible Tencent Video Windows release found");
  }

  const { version } = windows;
  // 官方下载页在 64 位 Windows 上优先提供 x64 安装包
  const downloadLink = windows.downloadLinkFor64 ?? windows.downloadLink;
  if (
    typeof version !== "string" ||
    !/^\d+(?:\.\d+)+$/.test(version) ||
    typeof downloadLink !== "string"
  ) {
    throw new Error("Invalid Tencent Video Windows release");
  }

  const linkVersion = downloadLink.match(
    /TencentVideo(\d+(?:\.\d+)+)(?:_x64)?\.exe(?:\?|$)/i,
  )?.[1];
  if (linkVersion !== version) {
    throw new Error(`Tencent Video version mismatch: ${downloadLink}`);
  }

  return { version, downloadLink };
}

export default async function (): Promise<Result<ScraperReturned, string>> {
  const payloadRes = await robustGet(DOWNLOAD_CONFIG_API, {
    headers: {
      Referer: "https://v.qq.com/download.html",
    },
  });
  if (payloadRes.err) {
    return new Err(`Error:Can't fetch Tencent Video download config`);
  }

  try {
    return new Ok(parseTencentVideoPayload(payloadRes.val));
  } catch (error) {
    return new Err(`Error:${(error as Error).message}`);
  }
}

export { parseTencentVideoPayload };
