import axios from "axios";
import cheerio from "cheerio";

let version: string

async function init() {
    //获得下载页面
    let axiosResponse = await axios.get("https://yasuo.360.cn/")
    let html = axiosResponse.data as string

    //挂载页面
    const $ = cheerio.load(html)

    //获取版本DOM
    let version_box = $('.ver');

    //获取版本号文本
    version = version_box.text()
    console.log(version)
}

function getVersion(): string {
    return version
}

function getDownloadLink(): string {
    return "https://dl.360safe.com/360zip_setup.exe"
}


export {
    init, getVersion, getDownloadLink
}
