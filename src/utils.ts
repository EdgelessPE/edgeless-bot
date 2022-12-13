import chalk from "chalk";
import fs from "fs";
import path from "path";
import { Err, Ok, Result } from "ts-results";
import Ajv from "ajv";
import iconv from "iconv-lite";
import { JsObjectType, ObjectValidationNode } from "./class";
import { badge } from "./worker";
import Piscina from "piscina";
import cp from "child_process";
import { PROJECT_ROOT } from "./const";

enum Cmp {
  L,
  E,
  G,
}

function print(text: string, ga_mode: boolean, badge?: string) {
  // 增加字符串类型判断
  if (typeof text !== "string") {
    console.log(
      (badge ? badge + " " : "") +
        chalk.yellow("Warning ") +
        "Illegal type detected"
    );
    console.log(JSON.stringify(text));
    return;
  }

  const spl = text.split(":");
  if (spl.length < 2) {
    console.log(
      (badge ? badge + " " : "") +
        chalk.yellow("Warning ") +
        "Illegal message detected"
    );
    console.log(text);
    return;
  }

  const inf = text.substring(spl[0].length + 1);
  switch (spl[0]) {
    case "Info":
      if (ga_mode) {
        console.log((badge ? badge + " " : "") + chalk.blue("Info: ") + inf);
      } else {
        console.log((badge ? badge + " " : "") + chalk.blue("Info ") + inf);
      }

      break;
    case "Success":
      if (ga_mode) {
        console.log(
          (badge ? badge + " " : "") + chalk.greenBright("Success: ") + inf
        );
      } else {
        console.log(
          (badge ? badge + " " : "") + chalk.greenBright("Success ") + inf
        );
      }

      break;
    case "Warning":
      if (ga_mode) {
        console.log("::warning::" + inf);
      } else {
        console.log(
          (badge ? badge + " " : "") + chalk.yellow("Warning ") + inf
        );
      }

      break;
    case "Error":
      if (ga_mode) {
        console.log("::error::" + inf);
      } else {
        console.log((badge ? badge + " " : "") + chalk.red("Error ") + inf);
      }

      break;
    default:
      if (ga_mode) {
        console.log("::warning::Illegal message detected:" + inf);
      } else {
        console.log(
          (badge ? badge + " " : "") +
            chalk.yellow("Warning ") +
            "Illegal message detected"
        );
        console.log(text);
      }
  }
}

/**
 * 通用日志输出封装，支持的日志格式为： [Level]:[Content]，有效的 [Level] 枚举取值为：Info、Warning、Error、Success
 * 示例： Info:This is a message
 * @param text 日志内容
 * @param b （可选）徽章
 */
function log(text: string, b?: string) {
  let d = b;
  if (b == null && Piscina.isWorkerThread) {
    d = badge;
  }
  print(text, false, d);
}

function formatVersion(version: string): Result<string, string> {
  const spl = version.split(".");

  //削减长的版本号
  if (spl.length > 4) {
    log(`Warning:Slice long version: ${version}`);
    return new Ok(`${spl[0]}.${spl[1]}.${spl[2]}.${spl[3]}`);
  }

  // 将版本号扩充为4位
  for (let i = 0; i < 4 - spl.length; i++) {
    version += ".0";
  }
  return new Ok(version);
}

function matchVersion(text: string): Result<string, string> {
  const regex = /(\d+\.)+\d+/;
  const matchRes = text.match(regex);
  if (!matchRes || matchRes.length === 0) {
    return new Err(`Error:Matched no version with ${text}"`);
  }

  return new Ok(matchRes[0]);
}

function isURL(str_url: string): boolean {
  return str_url.slice(0, 4) == "http";
}

function getSizeString(size: number): string {
  if (size < 1024) {
    return size.toFixed(2) + "B";
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + "KB";
  } else if (size < 1024 * 1024 * 1024) {
    return (size / (1024 * 1024)).toFixed(2) + "MB";
  } else {
    return (size / (1024 * 1024 * 1024)).toFixed(2) + "GB";
  }
}

function getTimeString(ms: number): string {
  const s = ms / 1000;
  if (s < 60) {
    return `${s.toFixed(1)} s`;
  } else {
    return `${(s / 60).toFixed(1)} min`;
  }
}

function versionCmp(a: string, b: string): Cmp {
  const x = a.split(".");
  const y = b.split(".");
  let result: Cmp = Cmp.E;

  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (Number(x[i]) < Number(y[i])) {
      result = Cmp.L;
      break;
    } else if (Number(x[i]) > Number(y[i])) {
      result = Cmp.G;
      break;
    }
  }

  // 处理前几位版本号相同但是位数不一致的情况，如1.3/1.3.0
  if (result === Cmp.E && x.length !== y.length) {
    // 找出较长的那一个
    const t: Array<string> = x.length < y.length ? y : x;
    // 读取剩余位
    for (
      let i = Math.min(x.length, y.length);
      i < Math.max(x.length, y.length);
      i++
    ) {
      if (Number(t[i]) !== 0) {
        result = x.length < y.length ? Cmp.L : Cmp.G;
        break;
      }
    }
  }

  return result;
}

async function awaitWithTimeout<P, R>(
  closure: (payload: P) => Promise<R>,
  timeout: number,
  payload: P
): Promise<R> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject("Await failed due to timeout");
    }, timeout);
    try {
      closure(payload).then(resolve);
    } catch (e) {
      reject(JSON.stringify(e));
    }
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function schemaValidator(
  obj: any,
  schema: string,
  root?: string
): Result<boolean, string> {
  //读取schema文件
  const schemaFilePath = path.join("./schema", schema + ".json");
  if (!fs.existsSync(schemaFilePath)) {
    return new Err(`Error:Specified schema not found : ${schemaFilePath}`);
  }
  const schemaJson = JSON.parse(fs.readFileSync(schemaFilePath).toString());

  const ajv = new Ajv();
  const validate = ajv.compile(schemaJson);
  if (validate(obj)) {
    return new Ok(true);
  } else {
    validate.errors?.forEach((item) => {
      log(`Error:At ${root ?? "" + item.instancePath} : ${item.message}`);
    });
    return new Ok(false);
  }
}

function objChainValidator(obj: any, chain: string[]): boolean {
  if (!(chain[0] in obj)) {
    return false;
  }
  //当chain数组大于1时进行递归
  if (chain.length > 1) {
    return objChainValidator(obj[chain[0]], chain.slice(1));
  } else {
    return true;
  }
}

function requiredKeysValidator(
  obj: any,
  requiredKeys: string[],
  disableAlert?: boolean
): boolean {
  let suc = true,
    keys = [];
  for (const originalString of requiredKeys) {
    keys = originalString.split(".");
    if (!objChainValidator(obj, keys)) {
      log(
        `${
          disableAlert ? "Warning" : "Error"
        }:Missing ${originalString} in task config`
      );
      suc = false;
      break;
    }
  }
  return suc;
}

function objectValidator(
  object: any,
  checkList: Array<ObjectValidationNode>,
  cd?: string
): boolean {
  let valid = true;
  for (const node of checkList) {
    //检验必须但缺失
    if (node.required && object[node.key] == null) {
      log(`Error:Missing required key : ${node.key}`);
      valid = false;
      continue;
    }
    //检验类型错误
    const getType = function (a: any): JsObjectType {
      let res;
      switch (typeof a) {
        case "number":
          res = JsObjectType.numberOrEnum;
          break;
        case "string":
          res = JsObjectType.string;
          break;
        case "boolean":
          res = JsObjectType.boolean;
          break;
        case "object":
          res = JsObjectType.object;
          break;
        case "function":
          res = JsObjectType.function;
          break;
        default:
          res = JsObjectType.invalid;
          break;
      }
      return res;
    };
    const explainType = function (b: JsObjectType): string {
      let res;
      switch (b) {
        case JsObjectType.numberOrEnum:
          res = "numberOrEnum";
          break;
        case JsObjectType.string:
          res = "string";
          break;
        case JsObjectType.boolean:
          res = "boolean";
          break;
        case JsObjectType.object:
          res = "object";
          break;
        case JsObjectType.function:
          res = "function";
          break;
        default:
          res = "invalid";
          break;
      }
      return res;
    };
    if (object[node.key] != null && getType(object[node.key]) != node.type) {
      log(
        `Error:Expect typeof ${cd ?? ""}${node.key} to be ${explainType(
          node.type
        )},got ${typeof object[node.key]}`
      );
      valid = false;
      continue;
    }
    //递归检验对象
    if (
      node.type == JsObjectType.object &&
      object[node.key] != null &&
      node.properties
    ) {
      valid = objectValidator(
        object[node.key],
        node.properties,
        `${cd ?? ""}${node.key}.`
      );
    }
  }
  return valid;
}

function toGBK(text: string): Buffer {
  return iconv.encode(text, "GBK");
}

function fromGBK(b: Buffer): string {
  return iconv.decode(b, "GBK");
}

function shuffle<T>(arr: Array<T>): Array<T> {
  let n = arr.length,
    random;
  while (0 != n) {
    random = (Math.random() * n--) >>> 0;
    [arr[n], arr[random]] = [arr[random], arr[n]];
  }
  return arr;
}

//TODO:拓展内置变量解析的覆盖范围
function parseBuiltInValue(
  source: string,
  v: {
    taskName: string;
    downloadedFile: string;
    latestVersion: string;
  },
  regexOptimizing?: boolean
): string {
  return source
    .replace("${taskName}", v.taskName)
    .replace("${downloadedFile}", v.downloadedFile)
    .replace(
      "${latestVersion}",
      regexOptimizing
        ? v.latestVersion.replace(".0", "(.0)*").replace(".", "\\.")
        : v.latestVersion
    );
}

function writeGBK(file: string, text: string) {
  fs.writeFileSync(file, toGBK(text));
}

function wherePECMD(): Result<string, string> {
  const p = [".\\pecmd.exe", ".\\bin\\pecmd.exe"];
  let r = "";
  for (const i of p) {
    if (fs.existsSync(path.join(PROJECT_ROOT, i))) {
      r = path.join(PROJECT_ROOT, i);
      break;
    }
  }
  if (r == "") {
    return new Err(
      'Error:Can\'t find pecmd.exe, store it to project root or "bin" folder'
    );
  } else {
    return new Ok(r);
  }
}

async function pressEnter(interval: number[]) {
  //生成pecmd脚本
  let script = "";
  for (const i of interval) {
    script += `WAIT ${i}000\nSEND VK_RETURN\n`;
  }
  //写脚本
  const p = PROJECT_ROOT + "/_press.wcs";
  fs.writeFileSync(p, script);
  //执行
  cp.execSync(`${wherePECMD().unwrap()} _press.wcs`, { cwd: PROJECT_ROOT });
  //删除脚本
  fs.unlinkSync(p);
}

function coverSecret(secret:string) {
  // 对半拆分密钥
  const cutPoint=Math.ceil(secret.length/2)
  const o1=secret.substring(0,cutPoint),o2=secret.substring(cutPoint)

  // 分别遮掩尾和头
  const c1=o1.substring(0,Math.ceil(o1.length*0.3)).padEnd(o1.length, "*"),
      c2=o2.substring(Math.ceil(o2.length*0.6)).padStart(o2.length, "*")

  return c1+c2
}

export {
  Cmp,
  log,
  formatVersion,
  matchVersion,
  isURL,
  getSizeString,
  getTimeString,
  versionCmp,
  awaitWithTimeout,
  sleep,
  schemaValidator,
  toGBK,
  fromGBK,
  objectValidator,
  shuffle,
  parseBuiltInValue,
  requiredKeysValidator,
  writeGBK,
  pressEnter,
  wherePECMD,
  coverSecret
};
