import axios from "axios";
import cheerio from "cheerio";
import {log} from '../../src/utils';


let version: string, url: string

async function init() {
    //获得Wechat下载页面
    let axiosResponse = await axios.get("https://pc.weixin.qq.com/?t=win_weixin&lang=zh_CN")
    let html = axiosResponse.data as string

    //挂载页面
    const $ = cheerio.load(html)

    //遍历下载页面的版本号Tags，找出最大的
    // let tags = $('.version-tag')
    // version = tags.first().text()
    // tags.toArray().forEach((e) => {
    //     let ver = e.data
    //     if (ver && ver > version) version = ver
    // })

    //获取版本号
    version = $('.download-version').text()
    console.log(version)

    //获取下载按钮DOM
    let download_box = $('#downloadButton');
    if (!download_box) {
        log("Error:Can't got valid dom node #downloadButton")
        throw "Scraping failed:DOM changed"
    }
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