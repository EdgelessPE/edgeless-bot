import {robustGet} from "../../src/network";
import {Err, Ok} from "ts-results";
import {parentPort} from "worker_threads";

let version: string, url: string

async function init() {
    //请求个人产品API
    let data = (await robustGet("https://www.huorong.cn/5.0.version.json")).val
    url = data.urlFull
    version = data.version
}

function getVersion(): string {
    return version
}

function getDownloadLink(): string {
    return url
}


(async () => {
    try {
        await init()
    } catch (e) {
        parentPort?.postMessage(new Err("Error:Function init() thrown error\n" + JSON.stringify(e)))
        return
    }
    parentPort?.postMessage(new Ok({
        version: getVersion(),
        downloadLink: getDownloadLink()
    }))
})()
