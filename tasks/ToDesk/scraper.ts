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

    //获得下载页面
    axiosResponse = await axios.get("https://www.todesk.com/download.html")
    html = axiosResponse.data as string
    //挂载页面
    $ = cheerio.load(html)
    //获取下载按钮DOM
    let download_box = $('.simple').prev("a")
    //获取下载链接
    url = download_box.attr('href') as string
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