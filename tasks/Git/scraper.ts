import axios from "axios";
import cheerio from 'cheerio';

let version: string, url: string


async function init() {
    let resp = await axios.get("https://git-scm.com/download/win")
    let html = resp.data
    const $ = cheerio.load(html)
    version = $("#main > p:nth-child(2) > strong:nth-child(2)").text() as string
    url     = $("#main > p:nth-child(9) > strong > a").attr("href") as string
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
