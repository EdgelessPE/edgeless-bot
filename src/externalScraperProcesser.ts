import {Interface, ScrapedInfo, Script, Task} from "./class";
import {Status} from "./enum";
import {awaitWithTimeout, formatVersion, isURL, log, matchVersion, toGbk} from "./utils"
import fs from "fs";
import {DIR_TASKS, DIR_WORKSHOP} from "./const";

//配置校验
function esConfigChecker(task: Task): boolean {
    const dir = DIR_TASKS + '/' + task.name;
    const options = task.externalScraperOptions

    //检查options
    if (options == undefined && task.autoMake) {
        log("Error:Missing key 'externalScraperOptions' as external scraper task")
        return false
    }

    //检查文件存在
    if (!fs.existsSync(dir + '/scraper.ts')) {
        log("Error:Missing scraper.ts as external scraper task")
        return false
    }

    //自动制作校验
    if (task.autoMake) {
        //检查policy是否提供
        if (options?.policy == undefined) {
            log("Error:Should provide externalScraperOptions.policy as external scraper task")
            return false
        }
        //校验policy正确性
        let allowedPolicies = ["silent", "manual"]
        if (!allowedPolicies.includes(options.policy)) {
            log("Error:Unknown policy:" + options.policy)
            return false
        }
    } else {
        //脚本制作需要提供buildRequirements
        if (task.buildRequirement == undefined) {
            log("Error:Should provide buildRequirement as external scraper task with make.cmd")
            return false
        }
    }

    //如果需要释放则检查
    if (options?.releaseInstaller && task.releaseRequirement == undefined) {
        log("Error:Should provide releaseRequirement as external scraper task enabled release installer")
        return false
    }

    //结束校验
    return true
}

//载入脚本并负责模块校验
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
    })
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
    if (!checked) {
        return new Interface<string>({
            status: Status.ERROR,
            payload: "Error:Scraper module for " + task.name + " invalid"
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
        //配置超时
        await awaitWithTimeout(module.init, 6000)
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
    //类型检查
    if (typeof version != "string") {
        return new Interface<string>({
            status: Status.ERROR,
            payload: "Error:Function getVersion() returned error type,expected string,got:" + typeof version + ",value:" + JSON.stringify(version)
        })
    }
    //正则提取
    let iMatchVersion = matchVersion(version)
    if (iMatchVersion.status == Status.ERROR) {
        return iMatchVersion
    }
    //美化版本号
    version = formatVersion(iMatchVersion.payload)

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
    //类型检查
    if (typeof url != "string") {
        return new Interface<string>({
            status: Status.ERROR,
            payload: "Error:Function getDownloadLink() returned error type,expected string,got:" + typeof url + ",value:" + JSON.stringify(url)
        })
    }
    //正则校验
    if (!isURL(url) || (url.slice(-3) != "exe" && url.slice(-3) != "msi")) {
        return new Interface<string>({
            status: Status.ERROR,
            payload: "Error:Function getDownloadLink() returned error url,got:" + url
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
    log("Info:Got version=" + version + ",url=" + url + " ,md5=" + md5)
    return new Interface<ScrapedInfo>({
        status: Status.SUCCESS,
        payload: {
            version,
            url,
            md5
        }
    })
}

//自动制作控制器
function esAutoMake(task: Task): boolean {
    log('Info:Start auto make ' + task.name);
    const workshop = DIR_WORKSHOP + '/' + task.name;

    //复制安装包
    try {
        fs.copyFileSync(workshop + '/target.exe', workshop + '/build/' + task.name + '_bot.exe');
    } catch (e) {
        log('Error:Can\'t copy target.exe:' + JSON.stringify(e))
        return false
    }

    //根据策略生成对应的外置批处理
    let makeStatus = true
    let finalScript = ""
    switch (task.externalScraperOptions?.policy) {
        case "silent":
            let arg = task.externalScraperOptions?.silentArg
            if (arg == undefined) arg = "/S"
            if (arg[0] == " ") arg = arg.slice(1, 0)
            let execCommand = "EXEC X:\\Program Files\\Edgeless\\" + task.name + "_bot.exe " + arg
            let delCommand = "FILE X:\\Program Files\\Edgeless\\" + task.name + "_bot.exe"
            if (task.externalScraperOptions?.silentDelete == false) delCommand = ""
            finalScript = execCommand + '\n' + delCommand
            break
        case "manual":
            let scName = "安装" + task.name
            if (task.externalScraperOptions?.manualShortcutName) scName = task.externalScraperOptions.manualShortcutName
            finalScript = "LINK X:\\Users\\Default\\Desktop\\" + scName + ",X:\\Program Files\\Edgeless\\" + task.name + "_bot.exe"
            break
        default:
            log("Error:Internal error,meet unknown policy:" + task.externalScraperOptions?.policy)
            makeStatus = false
    }
    if (!makeStatus) {
        log("Error:Can't create external batch")
        return false
    } else {
        // 写外置批处理
        const cmd = toGbk(finalScript);
        fs.writeFileSync(DIR_WORKSHOP + '/' + task.name + '/build/' + task.name + '_bot.wcs', cmd);
        log('Info:Save batch with command:\n' + finalScript);
    }

    //结束自动制作
    log('Info:Auto make executed successfully');
    return true;
}

export {
    esConfigChecker,
    loadScript,
    executor,
    esAutoMake,
}