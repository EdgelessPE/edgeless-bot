import {Interface, ScrapedInfo, Script, Task} from "./class";
import {Status} from "./enum";
import {log} from "./utils"

//载入脚本并负责校验
async function loadScript(task: Task): Promise<Interface<Script | string>> {
    let module = await import("../tasks/" + task.name + "/scraper.ts") as Script
    //校验
    let functionList = ["init", "getVersion", "getDownloadLink"]
    let checked = true
    functionList.forEach((name) => {
        if (!module.hasOwnProperty(name)) {
            checked = false
            log("Error:Missing function:" + name)
        }
        if (typeof module.init != "function") {
            checked = false
            log("Error:Module property 'init' isn't a function")
        }
        if (typeof module.getVersion != "function") {
            checked = false
            log("Error:Module property 'getVersion' isn't a function")
        }
        if (typeof module.getDownloadLink != "function") {
            checked = false
            log("Error:Module property 'getDownloadLink' isn't a function")
        }
    })
    if (!checked) {
        return new Interface<string>({
            status: Status.ERROR,
            payload: "Scraper module for " + task.name + " invalid"
        })
    } else {
        return new Interface<Script>({
            status: Status.SUCCESS,
            payload: module
        })
    }
}

//脚本执行器
async function executor(module: Script): Promise<Interface<ScrapedInfo | string>> {
    //初始化
    try {
        module.init()
    } catch (e) {
        return new Interface<string>({
            status: Status.ERROR,
            payload: "Error:Function init() throw:" + JSON.stringify(e)
        })
    }

    //获取版本号
    let version
    try {
        version = module.getVersion()
    } catch (e) {
        return new Interface<string>({
            status: Status.ERROR,
            payload: "Error:Function getVersion() throw:" + JSON.stringify(e)
        })
    }
    if (typeof version != "string") {
        return new Interface<string>({
            status: Status.ERROR,
            payload: "Error:Function getVersion() returned error type,expected string,got:" + typeof version + ",value:" + JSON.stringify(version)
        })
    }

    //获取链接
    let url
    try {
        url = module.getDownloadLink()
    } catch (e) {
        return new Interface<string>({
            status: Status.ERROR,
            payload: "Error:Function getDownloadLink() throw:" + JSON.stringify(e)
        })
    }
    if (typeof url != "string") {
        return new Interface<string>({
            status: Status.ERROR,
            payload: "Error:Function getDownloadLink() returned error type,expected string,got:" + typeof url + ",value:" + JSON.stringify(url)
        })
    }

    //获取MD5
    let md5
    try {
        md5 = module.getMD5?.()
        if (md5 == undefined) md5 = ""
    } catch (e) {
        return new Interface<string>({
            status: Status.ERROR,
            payload: "Error:Function getMD5() throw:" + JSON.stringify(e)
        })
    }
    if (typeof md5 != "string") {
        return new Interface<string>({
            status: Status.ERROR,
            payload: "Error:Function getMD5() returned error type,expected string,got:" + typeof md5 + ",value:" + JSON.stringify(md5)
        })
    }

    //返回
    return new Interface<ScrapedInfo>({
        status: Status.SUCCESS,
        payload: {
            version,
            url,
            md5
        }
    })
}

export {
    loadScript,
    executor
}