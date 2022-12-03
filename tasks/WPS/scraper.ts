import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";

export default async function (): Promise<Result<ScraperReturned, string>> {
  return new Ok({
    version: "0.0.0",
    downloadLink:
      "https://platform.wps.cn/download/query?down_os=win&os=win&os_version=Windows 10 or Windows Server 2016&channel_no=&timestamp=1,647,854,737,412",
  });
}
