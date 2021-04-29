const axios=require("axios")
const fs=require("fs")
const cheerio=require("cheerio")
const cp=require('child_process')
const cpt = require('crypto')

const DIR_TASKS="./tasks"
const DIR_WORKSHOP="./workshop"
const PATH_DATABASE="./database.json"
//Enum
enum Status {
    SUCCESS,ERROR
}
enum Cmp{
    L,E,G
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
            let text=this.payload as string
            let spl=text.split(":")
            if (spl.length<2){
                console.log("Warning:Illegal ERROR tip:"+this.payload)
                throw this.payload
            }
            if(spl[0]!=="Error"){
                console.log("Warning:Unwrapped wrong ERROR tip:"+this.payload)
                throw this.payload
            }
            throw spl[1]
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
    requirement:Array<string> //解压下载的exe后工作目录中应该出现的文件/文件夹，用于包校验

    constructor() {
        this.name="Null"
        this.category="Null"
        this.author="Null"
        this.paUrl="Null"
        this.requirement=["Null"]
    }
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
async function getMD5(filePath:string):Promise<string> {
    return new Promise(resolve => {
        let rs = fs.createReadStream(filePath)
        let hash = cpt.createHash('md5')
        let hex
        rs.on('data', hash.update.bind(hash))
        rs.on('end', function () {
            hex = hash.digest('hex')
            console.log('Info:MD5 is ' + hex)
            resolve(hex)
        })
    })
}
function parseDownloadUrl(href:string):string {
    //识别根目录字符“/”
    if(href[0]==="/") href="https://portableapps.com"+href

    return encodeURI(href)
}
function find7zip():Interface {
    let possiblePath=["C:\\Program Files\\7-Zip\\7z.exe","C:\\Program Files (x86)\\7-Zip\\7z.exe",'7zz.exe',"7z.exe","7za.exe",]
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
    let dst=DIR_WORKSHOP
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
    let dst=PATH_DATABASE
    if(!fs.existsSync(dst)){
        return {}
    }else{
        return JSON.parse(fs.readFileSync(dst).toString())
    }
}
function saveDatabase(json:any) {
    let dst=PATH_DATABASE
    if(fs.existsSync(dst)){
        if(fs.existsSync(dst+".bak")) fs.rmSync(dst+".bak")
        fs.renameSync(dst,dst+".bak")
    }

    fs.writeFileSync(dst,JSON.stringify(json))
}
function getTasks():Array<string> {
    let dst=DIR_TASKS
    let fileList=fs.readdirSync(dst)
    let result=[]
    fileList.forEach((item)=>{
        if(fs.statSync(dst+"/"+item).isDirectory()) result.push(item)
    })
    return result
}
function readTaskConfig(name:string):Interface {
    let dir=DIR_TASKS+"/"+name

    //判断Task文件夹合法性
    if(!fs.existsSync(dir+"/config.json")||!fs.existsSync(dir+"/make.cmd")){
        return new Interface({
            status:Status.ERROR,
            payload:"Warning:Skipping illegal task directory "+name
        })
    }

    //解析Json
    let json=JSON.parse(fs.readFileSync(dir+"/config.json").toString())

    //检查Json文件健全性
    let miss=null
    for (let taskKey in new Task()) {
        if(!json[taskKey]||json[taskKey]===null){
            miss=taskKey
            break
        }
    }
    if(miss){
        return new Interface({
            status:Status.ERROR,
            payload:"Warning:Skipping illegal task config "+name+",missing \""+miss+"\""
        })
    }

    return new Interface({
        status:Status.SUCCESS,
        payload:json
    })
}
function matchVersion(text:string):Interface {
    let regex=/\d+.\d+(.\d+)*/
    let matchRes=text.match(regex)
    if(!matchRes||matchRes.length===0){
        return new Interface({
            status:Status.ERROR,
            payload:"Error:Matched nothing when looking into \""+text+"\" with \""+regex+"\""
        })
    }else if(matchRes.length>1){
        console.log("Warning:Matched more than 1 result when looking into \""+text+"\" with \""+regex+"\"")
    }
    return new Interface({
        status:Status.SUCCESS,
        payload:matchRes[0]
    })
}
function versionCmp(a:string,b:string):Cmp {
    let x=a.split(".")
    let y=b.split(".")
    let result:Cmp=Cmp.E

    for (let i=0;i<Math.min(x.length,y.length);i++){
        if(Number(x[i])<Number(y[i])){
            result=Cmp.L
            break
        }else if(Number(x[i])>Number(y[i])){
            result=Cmp.G
            break
        }
    }

    return result
}
async function getWorkDirReady(name:string,url:string,p7zip:string,md5:string,req:Array<string>):Promise<boolean> {
    let dir=DIR_WORKSHOP+"/"+name

    //创建目录，因为程序初始化时会将workshop目录重建
    fs.mkdirSync(dir)
    fs.mkdirSync(dir+"/"+"build")

    //通过wget下载
    console.log("Info:Start downloading "+name)
    cp.execSync("wget -O target.exe "+url,{cwd:dir})

    //校验下载
    if(!fs.existsSync(dir+"/target.exe")){
        console.error("Warning:Downloading "+name+" failed,skipping...")
        return false
    }

    //校验md5
    if(md5!==""){
        let md5_calc=await getMD5(dir+"/target.exe")
        if(md5.toLowerCase()!==md5_calc.toLowerCase()){
            console.error("Warning:Task "+name+" 's MD5 checking failed,expected +"+md5+",got "+md5_calc+",skipping...")
            return false
        }
    }

    //使用7-Zip解压至release文件夹
    console.log("Info:Start extracting "+name)
    cp.execSync('\"'+p7zip+'\" e target.exe -orelease -y',{cwd:dir})

    //检查目录是否符合规范
    let miss=null
    for(let i in req){
        let n=req[i]
        if(!fs.existsSync(dir+"/release/"+n)) {
            miss=n
            break
        }
    }
    if(miss){
        console.log("Warning:Miss "+miss+" in "+name+"'s workshop,skipping...")
        return false
    }

    //复制make.cmd
    fs.copyFileSync(DIR_TASKS+"/"+name+"/make.cmd",dir+"/make.cmd")

    console.log("Info:Workshop for "+name+" is ready")
    return true
}
function runMakeScript(name):boolean {
    console.log("Info:Running make for "+name)
    try{
        cp.execSync("make.cmd",{cwd:DIR_WORKSHOP+"/"+name+"/release"})
    }catch (e) {
        console.log("Warning:Make error for "+name)
        console.log(e.output.toString())
        return false
    }
    console.log("Info:Finish making "+name)

    //校验目录可靠性
    let dirFiles=fs.readdirSync(DIR_WORKSHOP+"/"+name+"/build")
    let miss=true
    for (let i in dirFiles) {
        if(dirFiles[i].match(".wcs")||dirFiles[i].match(".cmd")){
            miss=false
            break
        }
    }
    if(miss){
        console.log("Warning:Illegal directory build from "+name+",skipping...")
        return false
    }

    return true
}

//scraper:PageInfo
async function scrapePage(url):Promise<Interface>{
    //配置可识别的类名
    let validClassName=[".download-link",".download-info"]

    //获取HTML信息并挂载
    let res
    try {
        res=await axios.get(url)
    }catch (err){
        return new Interface({
            status:Status.ERROR,
            payload:"Error:Http status code abnormal,can't scrape "+url+" ,message:"+err.message
        })
    }

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
// scrapePage("https://portableapps.com/apps/music_video/potplayer-portable")
// .then((res)=>{
//     let pageInfo=res.unwarp() as PageInfo
//     console.log(pageInfo.text)
//     console.log(pageInfo.href)
// })
console.log(readTaskConfig("Chrome1"))