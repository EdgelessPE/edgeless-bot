import axios from "axios";
import cheerio from "cheerio";

let version: string, url: string

async function init() {
    //获得下载页面
    let axiosResponse = await axios.get("https://anydesk.com/zhs/downloads/windows")
    let html = axiosResponse.data as string

    //挂载页面
    let $ = cheerio.load(html)

    //获取版本号
    let tag = $('.d-block')
    version = tag.text().split("(")[0]
    console.log(version)

    //获取下载按钮DOM
    // let download_box = $('#download-button')
    //获取下载链接
    // url = download_box.attr('href') as string
    url = "https://download.anydesk.com/AnyDesk.exe"
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
