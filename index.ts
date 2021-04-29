const axios=require("axios")
const fs=require("fs")
const cheerio=require("cheerio")
const cp=require('child_process')
//Enum
enum Status {
    SUCCESS,ERROR
}

//Class
//函数间通讯相关
class NaiveInterface {
    status:Status
    payload:any
}
class Interface {
    status:Status
    payload:any
    unwarp():any{
        if(this.status===Status.ERROR){
            throw this.payload
        }else{
            return this.payload
        }
    }
    constructor(config:NaiveInterface){
        this.status=config.status
        this.payload=config.payload
    }
}

class PageInfo {
    text:string
    href:string
}

//任务配置信息
class Task {
    name:string //软件名（也作为任务名）
    category:string //软件分类
    author:string //打包者名称

    paUrl:string //PortableApps网页链接
    versionMatchRegex:string //用于匹配版本号的正则表达式
    requirement:Array<string> //解压下载的exe后工作目录中应该出现的文件/文件夹，用于包校验

}

//数据库相关
class BuildInfo{
    version:string
    name:string
}
class DatabaseNode{
    latestVersion:string
    builds:Array<BuildInfo>
}

//utils
function parseDownloadUrl(href:string):string {
    //识别根目录字符“/”
    if(href[0]==="/") href="https://portableapps.com"+href

    return encodeURI(href)
}
function find7zip():Interface {
    let possiblePath=["C:\\Program Files\\7-Zip\\7z.exe","C:\\Program Files (x86)\\7-Zip\\7z.exe",'7zz',"7z","7za",]
    let result=null
    for (let i in possiblePath) {
        if(fs.existsSync(possiblePath[i])){
            result=possiblePath[i]
            break
        }
    }
    if(!result){
        return new Interface({
            status: Status.ERROR,
            payload: "Error:7-Zip not found,please install 7-Zip from https://www.7-zip.org"
        })
    }else{
        return new Interface({
            status:Status.SUCCESS,
            payload:result
        })
    }
}
function cleanWorkshop():boolean {
    let dst="workshop"
    if(fs.existsSync(dst)){
        cp.execSync('del /f /s /q "'+dst+'"')
        cp.execSync('rd /s /q "'+dst+'"')
    }
    if(fs.existsSync(dst)){
        console.error("Error:Can't remove workshop,kill running processes and retry")
        return false
    }
    fs.mkdirSync(dst)
    return fs.existsSync(dst)
}
function readDatabase():any {
    let dst="./database.json"
    if(!fs.existsSync(dst)){
        return {}
    }else{
        return JSON.parse(fs.readFileSync(dst).toString())
    }
}
function saveDatabase(json:any) {
    let dst="./database.json"
    if(fs.existsSync(dst)){
        if(fs.existsSync(dst+".bak")) fs.rmSync(dst+".bak")
        fs.renameSync(dst,dst+".bak")
    }

    fs.writeFileSync(dst,JSON.stringify(json))
}


//scraper:PageInfo
async function scrapePage(url):Promise<Interface>{
    //配置可识别的类名
    let validClassName=[".download-link",".download-info"]

    //获取HTML信息并挂载
    let res=await axios.get(url)

    //挂载HTML
    let $ = cheerio.load(res.data)

    //获取download-box DOM
    let dom_box=$(".download-box")

    //判断dom_box是否有效
    if(!dom_box){
        return new Interface({
            status:Status.ERROR,
            payload:"Error:DOM_DOWNLOAD_BOX not found,can't scrape "+url
        })
    }

    //获取有效节点
    let dom_node=null
    for (let i in validClassName) {
        dom_node=dom_box.children(validClassName[i])
        if(dom_node.attr("class")) break
    }

    //判断dom_node是否有效
    if(!dom_node.attr("class")){
        return new Interface({
            status:Status.ERROR,
            payload:"Error:Valid dom node not found,can't scrape "+url
        })
    }
    console.log("Info:Get valid dom node whose class is \""+dom_node.attr("class")+"\"")

    //分className处理，获取text和href
    let result=new PageInfo()
    switch (dom_node.attr("class")) {
        case "download-link":
            result.text=dom_node.text()
            result.href=dom_node.attr("href")
            break
        case "download-info":
            //获取box的首个子节点
            let dom_btn=dom_box.children("a")

            result.text=dom_node.text()
            result.href=dom_btn.attr("href")
            break
    }

    //校验结果是否有效
    if(!result.text||!result.href){
        return new Interface({
            status:Status.ERROR,
            payload:"Error:Null value caught in result,can't scrape "+url
        })
    }

    //处理href
    result.href=parseDownloadUrl(result.href)

    //输出提示
    console.log("Info:Scraped successfully")

    return new Interface({
        status:Status.SUCCESS,
        payload:result
    })
}

//task processor
// async function processTask(task:Task):Promise<Interface> {
//
// }

//main
scrapePage("https://portableapps.com/apps/music_video/potplayer-portable")
.then((res)=>{
    if(res.status===Status.ERROR){
        console.log(res.payload)
    }else{
        let pageInfo=res.payload as PageInfo
        console.log(pageInfo.text)
        console.log(pageInfo.href)
    }
})
