import register from "../templates/resolvers/_register";
import { Err, Ok, Result } from "ts-results";
import {
  ResolverParameters,
  ResolverRegister,
  ResolverReturned,
  WorkerDataResolver,
} from "./class";
import { piscina } from "./piscina";
import { getBadge } from "./badge";
import path from "path";
import fs from "fs";
import { log } from "./utils";
import { config } from "./config";

function searchTemplate(url: string): Result<ResolverRegister, string> {
  //匹配所有符合正则表达式的模板并选择匹配字符串长度最长的
  const results: {
    node: ResolverRegister;
    matchLength: number;
  }[] = [];
  for (const node of register) {
    const m = url.match(node.downloadLinkRegex);
    if (m != null) {
      results.push({
        node,
        matchLength: m[0].length,
      });
    }
  }
  if (results.length == 0) {
    return new Err("Info:No matched resolver template found");
  } else {
    results.sort((a, b) => a.matchLength - b.matchLength);
    return new Ok(results.pop()!.node);
  }
}

function parsePath(entrance: string): Result<string, string> {
  const p = path.join(
    __dirname,
    "..",
    "templates",
    "resolvers",
    entrance + ".js"
  );
  if (fs.existsSync(p)) {
    return new Ok(p);
  } else {
    return new Err("Error:Can't find " + p);
  }
}

export default async function (
  p: ResolverParameters,
  specifyEntrance?: string
): Promise<Result<ResolverReturned, string>> {
  const url = p.downloadLink;
  let entrance;
  if (specifyEntrance != undefined) {
    //禁用模板
    if (specifyEntrance == "None") {
      return new Ok({
        directLink: url,
      });
    }
    //使用钦定模板
    entrance = specifyEntrance;
  } else {
    //搜索模板
    const tRes = searchTemplate(url);
    if (tRes.err) {
      //未找到模板，说明是直链，直接返回
      log(tRes.val);
      return new Ok({
        directLink: url,
      });
    } else {
      //找到模板，配置模板入口
      const node = tRes.unwrap();
      log(`Info:Matched resolver template ${node.name} for link ${url}`);
      entrance = node.entrance;
    }
  }
  //解析模板位置
  const pRes = parsePath(entrance);
  if (pRes.err) {
    return pRes;
  }
  const badge = getBadge("Resolver");
  const wd: WorkerDataResolver = {
    badge,
    scriptPath: pRes.val,
    url,
    fileMatchRegex: p.fileMatchRegex,
    cd: p.cd,
    password: p.password,
  };
  let r = (await piscina.run(wd, { name: "resolver" })) as Result<
    ResolverReturned,
    string
  >;
  if (r.err || r.val == null) {
    if (config.MAX_RETRY_RESOLVER > 1) {
      for (let i = 1; i < config.MAX_RETRY_RESOLVER; i++) {
        r = (await piscina.run(wd, { name: "resolver" })) as Result<
          ResolverReturned,
          string
        >;
        if (r.ok) {
          break;
        }
      }
    } else {
      log("Error:Resolver resolved error : " + r.val, badge);
    }
  }
  return r;
}
