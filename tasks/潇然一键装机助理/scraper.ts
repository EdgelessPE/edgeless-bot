import { Ok, Err, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";

export default async function (): Promise<Result<ScraperReturned, string>> {
  // YOUR CODE HERE

  // 尝试从指定URL获取下载信息
  try {
    // 发起GET请求获取下载信息
    const res = await fetch(
      "https://alist.xrgzs.top/d/pxy/Xiaoran%20Studio/Onekey/QiiVersion.txt",
      { method: "GET" },
    );
    // 如果请求不成功，则返回错误信息
    if (!res.ok) {
      return new Err(`Failed to fetch data: ${res.status} ${res.statusText}`);
    }
    // 解析响应
    const ver = await res.text();
    console.log(ver);
    // 如果数据有效，返回下载链接信息
    return new Ok({
      version: ver,
      downloadLink:
        "https://alist.xrgzs.top/d/pxy/Xiaoran%20Studio/Onekey/PE/HotPE/XROK.HPM",
    });
    // 如果发生异常，返回错误信息
  } catch (err) {
    return new Err(`Fetch error: ${err}`);
  }
}
