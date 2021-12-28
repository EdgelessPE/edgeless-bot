import {ScraperParameters, ScraperReturned} from "../../class";
import axios from "axios";
import {Err, Ok, Result} from "ts-results";

function parseRepo(url: string): { owner: string, repo: string } {
    let splitRes = url.split("github.com/")[1].split("/")
    return {
        owner: splitRes[0],
        repo: splitRes[1]
    }
}

export default async function (p: ScraperParameters): Promise<Result<ScraperReturned, string>> {
    const {url} = p
    let version: string, downloadLink: string
    let repoInfo = parseRepo(url)

    //将API界面直接作为下载地址返回，后续会由GitHub Release下载模板解析
    downloadLink = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/releases`

    //获取Json
    let json
    try {
        json = (await axios.get(downloadLink)).data
    } catch (e) {
        console.log(JSON.stringify(e))
        return new Err(`Error:Can't fetch ${downloadLink}`)
    }
    version = json[0].tag_name
    return new Ok({
        version,
        downloadLink
    })
}
