import axios from "axios";
import {gb2312} from "../../src/utils";

let version: string, url: string

async function init() {
    //获取官网首页
    let page = await axios.get("https://pinyin.sogou.com/")
    //匹配出js中的所有下载地址
    let matches = page.data.toString().match(/window\.location\.href="\S*"/g) as RegExpMatchArray
    //筛选掉10版本（XP专用版）
    matches.forEach((item) => {
        if (item.match("sogou_pinyin_10") == null) url = item.split("=\"")[1].slice(0, -1)
    })
    console.log(url)

    //获取升级日志页面
    page = await axios.get("https://pinyin.sogou.com/changelog.php")
    //匹配所有的正式版发布信息
    //console.log(gb2312(page.data))
    matches = gb2312(page.data).match(/\d*\.\d*\S*<\/h2>/) as RegExpMatchArray
    //获取其中最高的版本号
    version = "0.0"
    let match
    matches.forEach((item) => {
        //提取版本号
        match = item.match(/\d*\.\d*/)
        if (match && versionCmp(version, match[0]) == -1) {
            version = match[0]
        }
    })
}

//版本号判断函数,返回1表示x>y,-1表示x<y
function versionCmp(x: string, y: string): number {
    let split_x = x.split(".")
    let split_y = y.split(".")
    let result = 0
    let i
    for (i = 0; i < Math.min(split_x.length, split_y.length); i++) {
        if (Number(split_x[i]) < Number(split_y[i])) {
            result = -1
            break
        } else if (Number(split_x[i]) > Number(split_y[i])) {
            result = 1
            break
        }
    }
    //当长度不相等时向后搜索长位是否全0
    if (result === 0 && split_x.length !== split_y.length) {
        if (split_x.length > split_x.length) {
            //处理x
            for (; i < split_x.length; i++) {
                if (Number(split_x[i]) !== 0) {
                    result = 1
                    break
                }
            }
        } else {
            //处理y
            for (; i < split_y.length; i++) {
                if (Number(split_y[i]) !== 0) {
                    result = -1
                    break
                }
            }
        }
    }
    return result
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
