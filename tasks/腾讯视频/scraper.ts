import axios from "axios";

let version: string, url: string

async function init() {
    //请求PC客户端重定向位置
    url = await fetchURL()
    url="https:"+url
    let vMatch = url.match(/\d*\.\d*\.\d*\.\d*\.exe$/)
    if (vMatch) {
        version = vMatch[0].slice(0, -4)
    }
}

function getVersion(): string {
    return version
}

function getDownloadLink(): string {
    return url
}

async function fetchURL(): Promise<string> {
    return new Promise((resolve) => {
        axios.get("https://node.video.qq.com/x/api/download_pc", {maxRedirects: 0,})
            .catch((e) => {
                resolve(e.response.headers.location)
            })
    })
}


export {
    init, getVersion, getDownloadLink
}
