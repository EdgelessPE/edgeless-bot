import axios from "axios";
import cheerio from "cheerio";

let version: string
let url = "https://mirrors.tuna.tsinghua.edu.cn/wireshark/win64/WiresharkPortable64_latest.paf.exe"


async function init() {
    let html_text = (await axios.get("https://mirrors.tuna.tsinghua.edu.cn/wireshark/win64/")).data as string
    const $ = cheerio.load(html_text)
    // 获取页面所有下载链接的文本

    let latestVersion = {
        "x": 0,
        "y": 0,
        "z": 0,
        "rc": 0
    }
    for (let index=0;index <= $('#list > tbody > tr > td.link > a').length;index++){
        let text = $(`#list > tbody > tr:nth-child(${index}) > td.link > a`).text()
        if (text.includes("Wireshark-win64-")){
            let Versions = [] as number[]
            ((text.slice(16,-4)).split(".")).forEach((v)=>{
                if (v.includes("rc")){
                    Versions.push(Number(v.slice(0,v.indexOf("rc"))))
                    Versions.push(Number(v.slice(v.indexOf("rc")+2)))
                }
                Versions.push(Number(v))
            })
            if(Versions.length < 4){Versions.push(0)}
            if (latestVersion['x'] < Versions[0] || latestVersion['y'] < Versions[1] || latestVersion['z'] < Versions[2] || latestVersion['rc'] < Versions[3]){
                latestVersion = {
                    "x": Versions[0],
                    "y": Versions[1],
                    "z": Versions[2],
                    "rc": Versions[3]
                }
            }
        }
    }
    version = `${latestVersion['x']}.${latestVersion['y']}.${latestVersion['z']}${latestVersion['rc']>0?"rc"+latestVersion['rc']:""}`
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