import axios from "axios";

let version: string, url: string

async function init() {
    //请求64位zip跳转地址
    url = await fetchURL()
    let vMatch = url.match(/\d*.\d*.\d*.zip/)
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
        axios.get("https://code.visualstudio.com/sha/download?build=stable&os=win32-x64-archive", {maxRedirects: 0,})
            .catch((e) => {
                resolve(e.response.headers.location)
            })
    })
}


export {
    init, getVersion, getDownloadLink
}
