import fs from "fs";
import { createHash } from "node:crypto";
import { log } from "./utils";
import { ValidationType } from "./class";
import path from "path";

import checksum from "checksum";

async function getMD5(filePath: string): Promise<string> {
  return new Promise((resolve) => {
    const rs = fs.createReadStream(filePath);
    const hash = createHash("md5");
    let hex;
    rs.on("data", hash.update.bind(hash));
    rs.on("end", () => {
      hex = hash.digest("hex");
      log(`Info:MD5 is ${hex}`);
      resolve(hex);
    });
  });
}

async function getSHA1(filePath: string): Promise<string> {
  return new Promise((resolve) => {
    checksum.file(filePath, (_: unknown, res: string) => {
      resolve(res);
    });
  });
}

async function getSHA256(filePath: string): Promise<string> {
  return new Promise((resolve) => {
    const rs = fs.createReadStream(filePath);
    const hash = createHash("sha256");
    let hex;
    rs.on("data", hash.update.bind(hash));
    rs.on("end", () => {
      hex = hash.digest("hex");
      log(`Info:SHA256 is ${hex}`);
      resolve(hex);
    });
  });
}

export default async function (
  filePath: string,
  method: ValidationType,
  targetValue: string,
): Promise<boolean> {
  let sum = "";
  switch (method) {
    case "MD5":
      sum = await getMD5(filePath);
      break;
    case "SHA1":
      sum = await getSHA1(filePath);
      break;
    case "SHA256":
      sum = await getSHA256(filePath);
      break;
    default:
      log("Error:Unknown ValidationType");
      break;
  }
  log(`Info:Checksum for ${path.parse(filePath).base},got ${sum}`);
  return sum == targetValue;
}
