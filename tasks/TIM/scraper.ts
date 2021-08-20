import axios from "axios";

let version: string, url: string

async function init() {
    //请求TIM动态配置接口
    let axiosResponse = await axios.get("https://qzonestyle.gtimg.cn/qzone/qzactStatics/configSystem/data/1605/config1.js")
    let text = axiosResponse.data as string

    //匹配"pcVersion"
    let match = text.match(/"pcVersion":"\d+.\d+(.\d+)*"/)
    if (match == null) throw "Match error:Can't match pcVersion"
    else version = match[0]

    //匹配"pcLink"
    match = text.match(/"pcLink":"\S*.exe"/)
    if (match == null) throw "Match error:Can't match pcLink"
    else url = match[0].split('"')[3]
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