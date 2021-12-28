import {ResolverParameters, ResolverReturned} from "../../class";
import {Err, Ok, Result} from "ts-results";
import axios from "axios";

export default async function (p: ResolverParameters): Promise<Result<ResolverReturned, string>> {
    const {downloadLink, fileMatchRegex} = p

    //获取Json
    let json
    try {
        json = (await axios.get(downloadLink)).data
    } catch (e) {
        console.log(JSON.stringify(e))
        return new Err(`Error:Can't fetch ${downloadLink}`)
    }
    //匹配assets数组
    let regex = new RegExp(fileMatchRegex)
    let assets = json[0].asserts
    console.log(json[0])
    let result = "", node
    for (let i = 0; i < assets.length; i++) {
        node = assets[i]
        if ((node.name as string).match(regex) != null) {
            result = node.browser_download_url
            break
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
