import { CONFIG } from "./class";
import fs from "fs";
import toml from "toml";
import { Err, Ok, Result } from "ts-results";
import { schemaValidator } from "./utils";
import { PATH_CONFIG } from "./const";
import minimist from "minimist";

function configGenerator(): Result<CONFIG, string> {
  if (!fs.existsSync(PATH_CONFIG)) {
    return new Err("Error:Can't find config.toml");
  } else {
    //读取和解析配置
    const text = fs.readFileSync(PATH_CONFIG).toString();
    let json;
    try {
      json = toml.parse(text) as any;
    } catch (e) {
      console.log(JSON.stringify(e));
      return new Err("Error:Can't parse config.toml");
    }
    //对非必需布尔项填充缺省值
    json["MODE_FORCED"] = false;
    json["GITHUB_ACTIONS"] = false;
    json["DEBUG_MODE"] = false;
    json["ENABLE_CACHE"] = false;
    //使用JSON Schema校验
    if (!schemaValidator(json, "config").unwrap()) {
      return new Err("Error:Validating config.toml failed");
    }
    //使用参数覆盖
    const args = minimist(process.argv.slice(2));
    const coverTable = [
      {
        arg: "g",
        key: "GITHUB_ACTIONS",
      },
      {
        arg: "f",
        key: "MODE_FORCED",
      },
      {
        arg: "t",
        key: "SPECIFY_TASK",
      },
      {
        arg: "c",
        key: "ENABLE_CACHE",
      },
    ];
    for (const coverNode of coverTable) {
      if (args[coverNode.arg] != null) {
        json[coverNode.key] = args[coverNode.arg];
      }
    }
    //特殊处理-d参数
    if (args["d"] != null) {
      json["DATABASE_UPDATE"] = false;
      json["REMOTE_ENABLE"] = false;
      json["DEBUG_MODE"] = true;
    } else {
      if (json["ENABLE_CACHE"]) {
        return new Err("Error: Only Debug Mode can enable download cache.");
      }
    }
    return new Ok(json);
  }
}

export const config = configGenerator().unwrap();
