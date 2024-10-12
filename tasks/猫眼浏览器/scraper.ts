import { Ok, Err, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";

export default async function (): Promise<Result<ScraperReturned, string>> {
  // 尝试从指定URL获取下载信息
  try {
    // 发起POST请求获取下载信息
    const res = await fetch(
      "https://www.catsxp.com/api/service/Update?cup2key=:",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
        },
        body: `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <app appid="{485AC8F6-31A4-3283-B765-92E31A816C51}" version="" ap="x64-release" />
</request>`,
      },
    );
    // 如果请求不成功，则返回错误信息
    if (!res.ok) {
      return new Err(`Failed to fetch data: ${res.status} ${res.statusText}`);
    }
    // 解析并验证响应数据格式
    const resp = await res.text();
    // 避免引入更多依赖，使用正则匹配
    const matchv = resp.match(/<manifest version="(.+?)">/);
    if (!matchv || !matchv[1]) {
      return new Err("Invalid response format");
    }
    const version = matchv[1];
    const matchdl = resp.match(/<url codebase="(.+?)"\/>/);
    if (!matchdl || !matchdl[1]) {
      return new Err("Invalid response format");
    }
    const downloadLink = matchdl[1];
    // 如果数据有效，返回下载链接信息
    return new Ok({
      version,
      downloadLink,
    });
  } catch (err) {
    return new Err(`Fetch error: ${err}`);
  }
}
