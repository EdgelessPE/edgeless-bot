import axios from "axios";

let version: string, url: string

async function init() {
    //请求 API
    let axiosResponse = await axios.get("https://pan.baidu.com/disk/cmsdata?do=client&t=1639412910616&channel=chunlei&clienttype=0&web=1&logid=MTYzOTQxMjkxMDYwOTAuNDgwODU1ODUxNTczMzEwOA==", {
        headers: {
            Referer: "https://pan.baidu.com/download"
        }
    })
    let data = axiosResponse.data
    //console.log(data.guanjia);

    //获取版本号与下载地址
    version = data.guanjia.version
    url = data.guanjia.url
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
