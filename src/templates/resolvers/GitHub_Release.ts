import {ResolverParameters, ResolverReturned} from "../../class";
import {Err, Ok, Result} from "ts-results";
import {robustGet} from "../../network";
import {log} from "../../utils";

export default async function (p: ResolverParameters): Promise<Result<ResolverReturned, string>> {
    const {downloadLink, fileMatchRegex} = p

    //获取Json
    let json
    try {
        json = (await robustGet(downloadLink)).unwrap()
    } catch (e) {
        console.log(JSON.stringify(e))
        return new Err(`Error:Can't fetch ${downloadLink}`)
    }
    //匹配assets数组
    let regex = new RegExp(fileMatchRegex)
    let assets = json[0].assets
    let result = "", node
    for (node of assets) {
        if (node == undefined) break
        if ((node.name as string).match(regex) != null) {
            if (result == "") {
                result = node.browser_download_url
                log(`Info:Matched ${node.name}`)
            } else {
                log(`Warning:Ambiguous fileMatchRegex,matched more than one file : ${node.name}`)
            }
        }
    }
    if (result == "") {
        return new Err("Error:Can't match any file with given fileMatchRegex")
    } else {
        return new Ok({
            directLink: result
        })
    }

}
