import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";
import fs from "fs";
import path from "path";

function fallbackToDatabase(): Result<ScraperReturned, string> {
  const databasePath = path.resolve(process.cwd(), "database.json");
  if (!fs.existsSync(databasePath)) {
    return new Ok({
      version: "0.0.0",
      downloadLink: "https://www.123pan.com/",
    });
  }

  const database = JSON.parse(fs.readFileSync(databasePath).toString()) as {
    "123云盘"?: { recent?: { latestVersion?: string } };
  };
  const version = database["123云盘"]?.recent?.latestVersion ?? "0.0.0";
  return new Ok({
    version,
    downloadLink: "https://www.123pan.com/",
  });
}

export default async function (): Promise<Result<ScraperReturned, string>> {
  let versionApi: any;
  try {
    versionApi = (
      await robustGet("https://www.123pan.com/api/version_upgrade", {
        responseType: "json",
        headers: {
          platform: "pc",
          "app-version": "109",
        },
      })
    ).unwrap();
  } catch {
    return fallbackToDatabase();
  }
  const versionUrl = `${
    versionApi.data.url
  }/latest.yml?noCache=${Math.random()}`;
  let versionInfo: any;
  try {
    versionInfo = (await robustGet(versionUrl)).unwrap() as string;
  } catch {
    return fallbackToDatabase();
  }
  const version = versionInfo.match(/version: (.+)/)[1];
  const downloadLink = `${versionApi.data.url}/${
    versionInfo.match(/url: (.+)/)[1]
  }`;
  return new Ok({
    version,
    downloadLink,
  });
}
