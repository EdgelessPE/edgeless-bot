import { Ok, Err, Result } from "ts-results";
import { ScraperReturned } from "../../src/types/class";
import { robustGet } from "../../src/utils/network";

export default async function (): Promise<Result<ScraperReturned, string>> {
  const page = (
    await robustGet("https://youku.com/product/index")
  ).unwrap() as string;

  // 匹配初始化数据
  const jsonTextMatch = page.match(/window\.__INITIAL_DATA__\s*=\s*([^;]+);/g);
  if (jsonTextMatch == null) return new Err("Error:Can't match initial data");
  const json = JSON.parse(
    jsonTextMatch[0].split(/window.__INITIAL_DATA__\s*=\s*/)[1].slice(0, -1),
  );
  // console.log(JSON.stringify(json,null,2))

  // 选中pc版
  const node = json[0].subNav[0];
  // console.log(JSON.stringify(node,null,2))

  return new Ok({
    version: node.ver,
    downloadLink: node.downloadUrl,
  });
}
