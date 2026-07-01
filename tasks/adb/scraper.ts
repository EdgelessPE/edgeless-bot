import { Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";

const DOWNLOAD_LINK =
  "https://dl.google.com/android/repository/platform-tools-latest-windows.zip";
const REPOSITORY_URL =
  "https://dl.google.com/android/repository/repository2-1.xml";

function fallbackToDatabase(): Result<ScraperReturned, string> {
  const version = fallbackVersion();
  return new Ok({
    version,
    downloadLink: DOWNLOAD_LINK,
  });
}

function fallbackVersion(): string {
  const databasePath = path.resolve(process.cwd(), "database.json");
  if (!fs.existsSync(databasePath)) {
    return "0.0.0";
  }

  const database = JSON.parse(fs.readFileSync(databasePath).toString()) as {
    adb?: { recent?: { latestVersion?: string } };
  };
  return database.adb?.recent?.latestVersion ?? "0.0.0";
}

function readRevision(repositoryXml: string): Result<string, string> {
  const $ = cheerio.load(repositoryXml, { xmlMode: true });
  const revision = $("remotePackage[path='platform-tools'] revision").first();
  if (revision.length == 0) {
    return new Ok(fallbackVersion());
  }

  const major = revision.children("major").first().text();
  const minor = revision.children("minor").first().text() || "0";
  const micro = revision.children("micro").first().text() || "0";
  if (!major) {
    return new Ok(fallbackVersion());
  }

  return new Ok(`${major}.${minor}.${micro}`);
}

export default async function (): Promise<Result<ScraperReturned, string>> {
  let repositoryXml: string;
  try {
    repositoryXml = (await robustGet(REPOSITORY_URL)).unwrap() as string;
  } catch {
    return fallbackToDatabase();
  }

  const versionRes = readRevision(repositoryXml);
  if (versionRes.err) {
    return versionRes;
  }

  return new Ok({
    version: versionRes.val,
    downloadLink: DOWNLOAD_LINK,
  });
}
