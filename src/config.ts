import {CONFIG} from "./class";
import fs from "fs";
import toml from 'toml'
import {Err, Ok, Result} from "ts-results";
import {schemaValidator} from "./utils";
import { PATH_CONFIG } from "./const";
import minimist from 'minimist';

export default function ():Result<CONFIG, string> {
    if(!fs.existsSync(PATH_CONFIG)){
        return new Err("Error:Can't find config.toml")
    }else {
        //读取和解析配置
        const text=fs.readFileSync(PATH_CONFIG).toString()
        let json
        try{
            json=toml.parse(text) as any
        }catch (e) {
            console.log(JSON.stringify(e))
            return new Err("Error:Can't parse config.toml")
        }
        //对非必需布尔项填充缺省值
        json["MODE_FORCED"]=false
        json["GITHUB_ACTIONS"]=false
        //使用JSON Schema校验
        if(!schemaValidator(json,"config").unwrap()){
            return new Err("Error:Validating config.toml failed")
        }
        //使用参数覆盖
        const args = minimist(process.argv.slice(2))
        const coverTable=[
            {
                arg:"g",
                key:"GITHUB_ACTIONS"
            },
            {
                arg:"f",
                key:"MODE_FORCED"
            },
            {
                arg:"t",
                key:"SPECIFY_TASK"
            }
        ]
        for (const coverNode of coverTable) {
            if(args.hasOwnProperty(coverNode.arg)) json[coverNode.key]=args[coverNode.arg]
        }
        //特殊处理-d参数
        if(args.hasOwnProperty("d")) {
            json["DATABASE_UPDATE"]=false
            json["REMOTE_ENABLE"]=false
        }
        return new Ok(json)
    }
}