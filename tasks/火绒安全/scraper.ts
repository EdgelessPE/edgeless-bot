import axios from "axios";
import {Err, Ok, Result} from "ts-results";
import {ScraperReturned} from "../../src/class";

let version: string, url: string

async function init() {
    //请求个人产品API
    let axiosRes = await axios.get("https://www.huorong.cn/5.0.version.json")
    url = axiosRes.data.urlFull
    version = axiosRes.data.version
}

function getVersion(): string {
    return version
}

function getDownloadLink(): string {
    return url
}


export default async function (): Promise<Result<ScraperReturned, string>> {
    try {
        await init()
    } catch (e) {
        console.log(JSON.stringify(e))
        return new Err("Error:Function init() thrown error")
    }
    return new Ok({
        version: getVersion(),
        downloadLink: getDownloadLink()
    })
}
