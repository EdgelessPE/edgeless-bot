import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";

export default async function (): Promise<Result<ScraperReturned, string>> {
  const request: any = await fetch(
    "https://yun.139.com/platformInfo/advertapi/adv-filter/adv-filter/AdInfoFilter/getAdInfos",
    {
      method: "POST",
      body: JSON.stringify({
        adpostid: 2016,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  const data = await request.json();
  const version = data.body
    .find((item: any) => item.name === "Windows")
    .description.match(/V([\d.]+)/)[1];
  const downloadLink = data.body.find(
    (item: any) => item.name === "Windows",
  ).adLink;
  return new Ok({
    version,
    downloadLink,
  });
}
