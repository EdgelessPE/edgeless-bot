import fs from "fs";
import {ENV_JSON_PATH} from "./const";
import {coverSecret, log} from "./utils";

let cache:any=null;
const notices:string[]=[]

function getEnv():Record<string, string> {
    if(cache!=null) return cache
    // 加载自定义环境变量
    if(fs.existsSync(ENV_JSON_PATH)){
        const env=JSON.parse(fs.readFileSync(ENV_JSON_PATH).toString()) as Record<string, string>;
        Object.entries(env).forEach(([key,value])=>{
            notices.push(`Info:Load env ${key}:${coverSecret(value)}`)
            process.env[key]=value
        })
    }
    cache=process.env
    return cache
}

function printLoadEnvNotices() {
    notices.forEach(n=>log(n))
}

export {
    getEnv,
    printLoadEnvNotices
}