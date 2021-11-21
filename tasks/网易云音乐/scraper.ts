import axios from "axios";

let version: string, url: string

async function init() {
    //请求PC客户端最新版
    url = await fetchURL()
    let vMatch = url.match(/\d*.\d*.\d*.\d*.exe$/)
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
        axios.get("https://music.163.com/api/pc/package/download/latest", {maxRedirects: 0,})
            .catch((e) => {
                resolve(e.response.headers.location)
            })
    })
}


export {
    init, getVersion, getDownloadLink
}
