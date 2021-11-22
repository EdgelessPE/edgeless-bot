import axios from "axios";
import cheerio from "cheerio";

let version: string

async function init() {
    //获得Bandizip页面
    let axiosResponse = await axios.get("https://www.bandisoft.com/bandizip/")
    let html = axiosResponse.data as string

    //挂载页面
    const $ = cheerio.load(html)

    //获取所有按钮
    let version_box = $('.button');

    //获取版本号文本
    version = version_box.text()
    console.log(version)
}

function getVersion(): string {
    return version
}

function getDownloadLink(): string {
    return "https://www.bandisoft.com/bandizip/dl.php?web"
}


export {
    init, getVersion, getDownloadLink
}
