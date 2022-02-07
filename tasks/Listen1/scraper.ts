import axios from "axios";
import cheerio from 'cheerio';

let version: string, url: string


async function init() {
    let resp = await axios.get("https://listen1.github.io/listen1/",
    {
        proxy:false
    }
    )
    let html = resp.data
    const $ = cheerio.load(html)
    const downloadButtonElement = $("body > section.page-header > a:nth-child(13)")
    version = downloadButtonElement.text() as string
    version = version.replace("下载 Windows 桌面绿色版64位 V","")
    url     = downloadButtonElement.attr("href") as string
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


