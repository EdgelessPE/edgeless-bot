import { Ok, Err, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";

export default async function (): Promise<Result<ScraperReturned, string>> {
  // YOUR CODE HERE

  // 尝试从指定URL获取下载信息
  try {
    // 发起GET请求获取下载信息
    const res = await fetch(
      "https://e.seewo.com/download/fromSeewoEdu?code=EasiNote5",
      { method: "GET" },
    );
    // 如果请求不成功，则返回错误信息
    if (!res.ok) {
      return new Err(`Failed to fetch data: ${res.status} ${res.statusText}`);
    }
    // 解析并验证响应数据格式
    const resp = await res.json();
    if (typeof resp !== "object" || !("downloadUrl" in resp.data)) {
      return new Err("Invalid response format");
    }
    // 如果数据有效，返回下载链接信息
    return new Ok({
      version: resp.data.downloadUrl,
      downloadLink: resp.data.downloadUrl,
    });
    // 如果发生异常，返回错误信息
  } catch (err) {
    return new Err(`Fetch error: ${err}`);
  }
}
