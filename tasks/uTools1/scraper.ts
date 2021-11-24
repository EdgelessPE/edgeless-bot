import axios from "axios";

let version: string, url: string

async function init() {
    //请求官网
    let res = await axios.get("https://www.u.tools/")
    let page = res.data as string
    //匹配publishURL
    let pum = page.match(/publishURL\s*=\s*'http\S*/) as RegExpMatchArray
    let publishURL = pum[0].split("'")[1]
    //匹配package
    let pm = page.match(/uTools-\d*\.\d*\.\d*\.exe/) as RegExpMatchArray
    let name = pm[0]
    url = publishURL + name
    //匹配版本号
    let vm = name.match(/\d*\.\d*\.\d*/) as RegExpMatchArray
    version = vm[0]
}

function getVersion(): string {
    return version
}

function getDownloadLink(): string {
    return url
}


export {
    init, getVersion, getDownloadLink
}
