import register from "../templates/resolvers/_register"
import {Err, Ok, Result} from "ts-results";
import {ResolverParameters, ResolverRegister, ResolverReturned, WorkerDataResolver} from "./class";
import {piscina} from "./piscina";
import {getBadge} from "./badge";
import path from "path";
import fs from "fs";
import {log} from "./utils";

function searchTemplate(url: string): Result<ResolverRegister, string> {
    let result = null
    for (let node of register) {
        if (url.match(node.downloadLinkRegex)) {
            result = node
            break
        }
    }
    if (result == null) {
        return new Err("Info:No matched resolver template found")
    } else {
        return new Ok(result)
    }
}

function parsePath(entrance: string): Result<string, string> {
    let p = path.join(__dirname, "..", "templates", "resolvers", entrance + ".js")
    if (fs.existsSync(p)) {
        return new Ok(p)
    } else {
        return new Err("Error:Can't find " + p)
    }
}

export default async function (p: ResolverParameters): Promise<Result<string, string>> {
    const url = p.downloadLink
    //搜索模板
    let tRes = searchTemplate(url)
    if (tRes.err) {
        log(tRes.val)
        return new Ok(url)
    }
    //解析模板位置
    let pRes = parsePath(tRes.val.entrance)
    if (pRes.err) {
        return pRes
    }
    const badge = getBadge("Resolver")
    const wd: WorkerDataResolver = {
        badge,
        scriptPath: pRes.val,
        url,
        fileMatchRegex: p.fileMatchRegex,
        cd: p.cd
    }
    let res = (await piscina.run(wd, {name: "resolver"})) as Result<ResolverReturned, string>
    if (res.err) {
        return res
    } else {
        return new Ok(res.val.directLink)
    }
}
