import {robustGet} from "../../src/network";
import {Ok, Result} from "ts-results";
import {ScraperReturned} from "../../src/class";

let version: string, url: string

async function init() {
    //请求个人产品API
    let data = (await robustGet("https://www.huorong.cn/5.0.version.json")).val
    url = data.urlFull
    version = data.version
}

function getVersion(): string {
    return version
}

function getDownloadLink(): string {
    return url
}

export default async function (): Promise<Result<ScraperReturned, string>> {
    await init()
    return new Ok({
        version: getVersion(),
        downloadLink: getDownloadLink()
    })
}
