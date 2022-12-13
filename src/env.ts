import fs from "fs";
import {ENV_JSON_PATH} from "./const";
import {coverSecret, log} from "./utils";
import minimist from "minimist";

let cache:any=null;
const notices:string[]=[]

function load2ProcessEnv(data:Record<string, string>,from:string) {
    Object.entries(data).forEach(([key,value])=>{
        notices.push(`Info:Load env ${key}:${coverSecret(value)} from ${from}`)
        process.env[key]=value
    })
}

function getEnv():Record<string, string> {
    if(cache!=null) return cache;
    // 加载自定义环境变量文件
    if(fs.existsSync(ENV_JSON_PATH)){
        const env=JSON.parse(fs.readFileSync(ENV_JSON_PATH).toString()) as Record<string, string>;
        load2ProcessEnv(env,ENV_JSON_PATH)
    }
    // 加载自定义环境变量参数
    const envInput = minimist(process.argv.slice(2))["e"];
    if(envInput){
        const arr=envInput.split(","),data:Record<string, string>={}
        for(const strPair of arr){
            const s=strPair.split("=")
            data[s[0]]=s[1]
        }
        load2ProcessEnv(data,"-e argument")
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