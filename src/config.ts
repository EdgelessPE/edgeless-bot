import {CONFIG} from "./class";
import fs from "fs";
import path from "path";
import toml from 'toml'
import {Err, Ok, Result} from "ts-results";
import {schemaValidator} from "./utils";
import { PATH_CONFIG } from "./const";

export default function ():Result<CONFIG, string> {
    if(!fs.existsSync(PATH_CONFIG)){
        return new Err("Error:Can't find config.toml")
    }else {
        //读取和解析配置
        const text=fs.readFileSync(PATH_CONFIG).toString()
        let json
        try{
            json=toml.parse(text) as CONFIG
        }catch (e) {
            console.log(JSON.stringify(e))
            return new Err("Error:Can't parse config.toml")
        }
        //使用JSON Schema校验
        if(schemaValidator(json,"config").unwrap()){
            return new Ok(json)
        }else {
            return new Err("Error:Validating config.toml failed")
        }
    }
}
