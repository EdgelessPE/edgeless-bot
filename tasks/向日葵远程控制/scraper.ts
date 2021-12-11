import axios from "axios";

let version: string, url: string

async function init() {
    //请求Win x64 API
    let axiosResponse = await axios.get("https://client-api.oray.com/softwares/SUNLOGIN_X_WINDOWS?x64=1&_t=1639239993")
    let data = axiosResponse.data
    //获取版本号与下载地址
    version = data.versionno
    url = data.downloadurl
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
