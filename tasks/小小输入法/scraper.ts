import { Err, Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { log } from "../../src/utils";
import fs from "fs";
import path from "path";

const YSEPAN_API_BASE = "https://c6.ysepan.com/api/";
const DLMC = "yongim";
const WINDOWS_DIR_BH = 448795;
const WIN_ARCHIVE_REGEX = /^yong-win-.+\.7z$/;

function generateToken(): string {
  return (
    Date.now().toString() +
    Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")
  );
}

interface YsepanDirectory {
  xzpz: string;
}

interface YsepanFile {
  wjm: string;
  fwq: string;
  pz: string;
  sj: string;
}

function fallbackToDatabase(): Result<ScraperReturned, string> {
  const databasePath = path.resolve(process.cwd(), "database.json");
  if (!fs.existsSync(databasePath)) {
    return new Ok({
      version: "0.0.0",
      downloadLink: "https://yongim.ysepan.com/",
    });
  }

  const database = JSON.parse(fs.readFileSync(databasePath).toString()) as {
    小小输入法?: { recent?: { latestVersion?: string } };
  };
  const version = database["小小输入法"]?.recent?.latestVersion ?? "0.0.0";
  return new Ok({
    version,
    downloadLink: "https://yongim.ysepan.com/",
  });
}

async function ysepanFetch(
  url: string,
  method: string,
  token: string,
  body?: string,
): Promise<Result<Response, string>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${DLMC};${token}`,
  };
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = body;
  }
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      return new Err(`Error:Ysepan API returned ${res.status} for ${url}`);
    }
    return new Ok(res);
  } catch (e) {
    return new Err(
      `Error:Ysepan fetch failed for ${url}: ${(e as Error).message}`,
    );
  }
}

function extractVersion(filename: string): string {
  const match = filename.match(/^yong-win-(.+)\.7z$/);
  if (match == null) {
    throw new Error(`Invalid Windows archive filename: ${filename}`);
  }
  return match[1];
}

export default async function (): Promise<Result<ScraperReturned, string>> {
  const token = generateToken();

  const sessionRes = await ysepanFetch(
    `${YSEPAN_API_BASE}auth`,
    "POST",
    token,
    JSON.stringify({ dlmc: DLMC }),
  );
  if (sessionRes.err) {
    return fallbackToDatabase();
  }

  const filesRes = await ysepanFetch(
    `${YSEPAN_API_BASE}wj/wjdq`,
    "POST",
    token,
    JSON.stringify({ mlbh: WINDOWS_DIR_BH, kqmm: "", wjbh: 0, ip1: "" }),
  );
  if (filesRes.err) {
    return fallbackToDatabase();
  }

  let data: any;
  try {
    data = await filesRes.val.json();
  } catch (e) {
    return new Err(
      `Error:Failed to parse ysepan files response: ${(e as Error).message}`,
    );
  }

  const dirInfo: YsepanDirectory = data.ml;
  const files: YsepanFile[] = data.lb;
  if (!dirInfo || !files) {
    return new Err("Error:Invalid ysepan API response structure");
  }

  const winArchives = files.filter((f) => WIN_ARCHIVE_REGEX.test(f.wjm));
  if (winArchives.length === 0) {
    return new Err("Error:No Windows archive found on ysepan");
  }

  winArchives.sort((a, b) => b.sj.localeCompare(a.sj));
  const latest = winArchives[0];
  log(`Info:Latest ysepan Windows archive: ${latest.wjm}`);

  const version = extractVersion(latest.wjm);
  const downloadLink = `https://ys-${latest.fwq}.ysepan.com/wap/${DLMC}/${dirInfo.xzpz}/${latest.pz}/${latest.wjm}`;

  return new Ok({ version, downloadLink });
}

export { extractVersion };
