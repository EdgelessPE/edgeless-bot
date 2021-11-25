import axios from "axios";

let version: string, url: string

async function init() {
    //请求PC客户端最新版
    url = await fetchURL()
    console.log(url)
    let vMatch = url.match(/\d*\.\d*\.\d*/)
    if (vMatch) {
        version = vMatch[0]
    }
    console.log(version)
}

function getVersion(): string {
    return version
}

function getDownloadLink(): string {
    return url
}

async function fetchURL(): Promise<string> {
    return new Promise((resolve) => {
        axios.get("https://dl.google.com/android/repository/platform-tools-latest-windows.zip", {maxRedirects: 0,})
            .catch((e) => {
                resolve(e.response.headers.location)
            })
    })
}


export {
    init, getVersion, getDownloadLink
}
