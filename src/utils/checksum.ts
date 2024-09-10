import { log } from "./index";
import { ValidationType } from "../types/class";
import path from "path";
import { load, createHash as blake3CreateHash } from "blake3";

import checksum from "checksum";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

async function getMD5(filePath: string): Promise<string> {
  return new Promise((resolve) => {
    const rs = createReadStream(filePath);
    const hash = createHash("md5");
    let hex;
    rs.on("data", hash.update.bind(hash));
    rs.on("end", () => {
      hex = hash.digest("hex");
      log("Info:MD5 is " + hex);
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
    const rs = createReadStream(filePath);
    const hash = createHash("sha256");
    let hex;
    rs.on("data", hash.update.bind(hash));
    rs.on("end", () => {
      hex = hash.digest("hex");
      log("Info:SHA256 is " + hex);
      resolve(hex);
    });
  });
}

let loaded = false;
export async function getBLAKE3(filePath: string): Promise<string> {
  if (!loaded) {
    await load();
    loaded = true;
  }
  return new Promise((resolve) => {
    const stream = createReadStream(filePath);
    const hash = blake3CreateHash();
    stream.on("data", (d) => hash.update(d));
    stream.on("error", (err) => {
      hash.dispose();
      throw err;
    });
    stream.on("end", () => resolve(hash.digest("hex").toString()));
  });
}

export default async function (
  filePath: string,
  method: ValidationType,
  targetValue: string,
): Promise<boolean> {
  const fnMap: Record<ValidationType, (filePath: string) => Promise<string>> = {
    MD5: getMD5,
    SHA1: getSHA1,
    SHA256: getSHA256,
    BLAKE3: getBLAKE3,
  };
  const sum = await fnMap[method]?.(filePath);
  log(`Info:Checksum for ${path.parse(filePath).base},got ${sum}`);
  return sum == targetValue;
}
