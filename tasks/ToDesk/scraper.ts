import axios from "axios";
import cheerio from "cheerio";

let version: string, url: string

async function init() {
    //获得ToDesk下载页面
    let axiosResponse = await axios.get("https://update.todesk.com/windows/uplog.html")
    let html = axiosResponse.data as string

    //挂载页面
    let $ = cheerio.load(html)

    //获取最大的版本号
    let tags = $('.text')
    version = tags.first().text()
    console.log(version)

    //获取下载链接
    url = "https://dl.todesk.com/windows/ToDesk_Setup.exe"
    console.log(url)
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
