import axios from "axios";

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


export {
    init, getVersion, getDownloadLink
}