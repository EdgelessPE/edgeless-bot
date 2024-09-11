import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";

export default async function (): Promise<Result<ScraperReturned, string>> {
  return new Ok({
    version: "0.0.0", // 保持版本号为 0.0.0
    downloadLink: "https://dl.aomeikeji.com/av/YCKK_AnyViewerSetup.exe", // 手动更改此处的下载链接
  });
}
