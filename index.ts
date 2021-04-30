const axios=require("axios")
const fs=require("fs")
const cheerio=require("cheerio")
const cp=require('child_process')
const cpt = require('crypto')
const chalk = require('chalk')

//默认配置
let config:Config={
    DIR_TASKS:"./tasks",
    DIR_WORKSHOP:"./workshop",
    DIR_BUILDS:"./builds",
    PATH_DATABASE:"./database.json",
    MAX_BUILDS:3,
    DISABLE_UPLOAD:false,
    REMOTE_NAME:"pineapple",
    REMOTE_ROOT:"/hdisk/edgeless/插件包",
}
//读取配置
if(fs.existsSync("./config.json")){
    let json=JSON.parse(fs.readFileSync("./config.json"))
    for (let jsonKey in json) {
        if(config.hasOwnProperty(jsonKey)){
            log("Info:Load config "+jsonKey+":"+json[jsonKey])
            config[jsonKey]=json[jsonKey]
        }else{
            log("Warning:Invalid config key "+jsonKey)
        }
    }
}else{
    log("Warning:config.json not found,program may won't run properly")
}

const DIR_TASKS=config.DIR_TASKS
const DIR_WORKSHOP=config.DIR_WORKSHOP
const DIR_BUILDS=config.DIR_BUILDS
const PATH_DATABASE=config.PATH_DATABASE
const MAX_BUILDS=config.MAX_BUILDS
const DISABLE_UPLOAD=config.DISABLE_UPLOAD
const REMOTE_NAME=config.REMOTE_NAME
const REMOTE_ROOT=config.REMOTE_ROOT

//Enum
enum Status {
    SUCCESS,ERROR
}
enum Cmp{
    L,E,G
}
//Class
//常量配置
class Config{
    DIR_TASKS:string
    DIR_WORKSHOP:string
    DIR_BUILDS:string
    PATH_DATABASE:string
    MAX_BUILDS:number
    DISABLE_UPLOAD:boolean
    REMOTE_NAME:string
    REMOTE_ROOT:string
}

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
                log("Warning:Caught illegal ERROR tip by unwarp()")
                log("Error:"+text)
                throw "EXIT"
            }
            if(spl[0]!=="Error"){
                log("Warning:Expected ERROR tip,got "+spl[0]+" by unwarp()")
                log("Error:"+text.substring(spl[0].length+1))
                throw "EXIT"
            }
            log(text)
            throw "EXIT"
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
    constructor() {
        this.latestVersion="0.0.0"
        this.builds=[]
    }
}

//utils
function log(text:string){
    let spl=text.split(":")
    if (spl.length<2){
        console.log(chalk.yellow("Warning")+" Illegal message detected")
        console.log(text)
        return
    }
    let inf=text.substring(spl[0].length+1)
    switch(spl[0]){
        case "Info":
            console.log(chalk.green("Info ")+inf)
            break
        case "Warning":
            console.log(chalk.yellow("Warning ")+inf)
            break
        case "Error":
            console.log(chalk.red("Error ")+inf)
            break
        default:
            console.log(chalk.yellow("Warning ")+"Illegal message detected")
            console.log(text)
    }
}
async function getMD5(filePath:string):Promise<string> {
    return new Promise(resolve => {
        let rs = fs.createReadStream(filePath)
        let hash = cpt.createHash('md5')
        let hex
        rs.on('data', hash.update.bind(hash))
        rs.on('end', function () {
            hex = hash.digest('hex')
            log('Info:MD5 is ' + hex)
            resolve(hex)
        })
    })
}
function parseDownloadUrl(href:string):string {
    //识别根目录字符“/”
    if(href[0]==="/") href="https://portableapps.com"+href

    return encodeURI(href)
}
function matchVersion(text:string):Interface {
    let regex=/\d+.\d+(.\d+)*/
    let matchRes=text.match(regex)
    if(!matchRes||matchRes.length===0){
        return new Interface({
            status:Status.ERROR,
            payload:"Warning:Matched nothing when looking into \""+text+"\" with \""+regex+"\",skipping..."
        })
    }
    return new Interface({
        status:Status.SUCCESS,
        payload:matchRes[0]
    })
} //Interface:string
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
    //处理前几位版本号相同但是位数不一致的情况，如1.3/1.3.0
    if(result===Cmp.E&&x.length!==y.length){
        //找出较长的那一个
        let t:Array<string>
        t = x.length < y.length ? y : x
        //读取剩余位
        for (let i=Math.min(x.length,y.length);i<Math.max(x.length,y.length);i++){
            if(Number(t[i])!==0){
                result= x.length < y.length ? Cmp.L : Cmp.G
                break
            }
        }
    }

    return result
}
function removeExtraBuilds(database:DatabaseNode,repo:string,category:string):DatabaseNode{
    //builds降序排列
    database.builds.sort((a,b)=>{
        return 1-versionCmp(a.version,b.version)
    })
    //删除多余的builds
    for(let i=0;i<database.builds.length-MAX_BUILDS;i++){
        let target=database.builds.pop()
        log("Info:Remove extra build "+repo+"/"+target.name)
        fs.unlinkSync(repo+"/"+target.name)
        if(!deleteFromRemote(target.name,category)){
            log("Warning:Fail to delete extra build "+target.name)
        }
    }

    return database
}

//remote
function uploadToRemote(zname:string,category:string):boolean {
    let localPath=DIR_BUILDS+"/"+category+"/"+zname
    let remotePath=REMOTE_ROOT+"/"+category
    
    try{
        cp.execSync("rclone copy \""+localPath+"\" "+REMOTE_NAME+":"+remotePath)
    }catch (err) {
        console.log(err.output.toString())
        return false
    }
    return true
}
function deleteFromRemote(zname:string,category:string):boolean {
    let remotePath=REMOTE_ROOT+"/"+category+"/"+zname

    try{
        cp.execSync("rclone delete "+REMOTE_NAME+":"+remotePath)
    }catch (err) {
        console.log(err.output.toString())
        return false
    }
    return true
}

//init
function beforeRunCheck():boolean{
    //预设严重错误函数
    let l=function (text:string):boolean{
        log("Error:Check failure:"+text)
        return false
    }

    //检查是否在Windows中
    if(!fs.existsSync("C:\\Windows\\System32")){
        return l("Please run inside Windows")
    }
    //检查目录中文件夹是否到位
    let dirList:Array<string> = [DIR_BUILDS,DIR_TASKS]
    dirList.forEach((path)=>{
        if(!fs.existsSync(path)){
            fs.mkdirSync(path)
            if(!fs.existsSync(path)){
                return l("Can't create folder "+path)
            }
        }
    })
    //检查命令可用性
    let cmdList:Array<any> = [
        {
            cmd:"rclone",
            hint:"rclone"
        },
        {
            cmd:"wget",
            hint:"wget"
        }
    ]
        cmdList.forEach((item)=>{
        try{
            cp.execSync("where "+item.cmd)
        }catch (err) {
            return l("Command not found:"+item.cmd+",please install "+item.hint+"\nTry \"scoop install "+item.hint+"\" if you have scoop installed")
        }
    })

    return true
}
function cleanWorkshop():boolean {
    let dst=DIR_WORKSHOP.substring(2)
    if(fs.existsSync(dst)){
        cp.execSync('del /f /s /q '+dst)
        cp.execSync('rd /s /q '+dst)
    }
    if(fs.existsSync(dst)){
        log("Error:Can't remove workshop,kill running processes and retry")
        return false
    }
    fs.mkdirSync(dst)
    return fs.existsSync(dst)
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
            payload: "Error:7-Zip not found,please install 7-Zip from https://www.7-zip.org or put 7z/7zz/7za.exe in project folder"
        })
    }else{
        return new Interface({
            status:Status.SUCCESS,
            payload:result
        })
    }
} //Interface:string

//database
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

//task
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

    //检查Json健全性
    //TODO 保持json.name名称与文件名一致
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
} //Interface:Task
async function getWorkDirReady(name:string,url:string,p7zip:string,md5:string,req:Array<string>):Promise<boolean> {
    let dir=DIR_WORKSHOP+"/"+name

    //创建目录，因为程序初始化时会将workshop目录重建
    fs.mkdirSync(dir)
    fs.mkdirSync(dir+"/"+"build")

    //通过wget下载
    log("Info:Start downloading "+name)
    try{
        cp.execSync("wget -O target.exe "+url,{cwd:dir})
    }catch (e) {
        log("Warning:Downloading "+name+" failed,skipping...")
        return false
    }

    //校验下载
    if(!fs.existsSync(dir+"/target.exe")){
        log("Warning:Downloading "+name+" failed,skipping...")
        return false
    }

    //校验md5
    if(md5!==""){
        let md5_calc=await getMD5(dir+"/target.exe")
        if(md5.toLowerCase()!==md5_calc.toLowerCase()){
            log("Warning:Task "+name+" 's MD5 checking failed,expected +"+md5+",got "+md5_calc+",skipping...")
            return false
        }
    }

    //使用7-Zip解压至release文件夹
    log("Info:Start extracting "+name)
    cp.execSync('\"'+p7zip+'\" x target.exe -orelease -y',{cwd:dir})

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
        log("Warning:Miss "+miss+" in "+name+"'s workshop,skipping...")
        return false
    }

    //复制make.cmd
    fs.copyFileSync(DIR_TASKS+"/"+name+"/make.cmd",dir+"/make.cmd")

    log("Info:Workshop for "+name+" is ready")
    return true
}
function runMakeScript(name:string):boolean {
    log("Info:Running make for "+name)
    try{
        cp.execSync("make.cmd",{cwd:DIR_WORKSHOP+"/"+name})
    }catch (e) {
        log("Warning:Make error for "+name+",skipping...")
        console.log(e.output.toString())
        return false
    }
    log("Info:Finish making "+name)

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
        log("Warning:Illegal directory build from "+name+",skipping...")
        return false
    }

    return true
}
function buildAndDeliver(name:string,version:string,author:string,category:string,p7zip:string,database:DatabaseNode):Interface{
    let zname=name+"_"+version+"_"+author+"（bot）.7z"
    let dir=DIR_WORKSHOP+"/"+name
    let repo=DIR_BUILDS+"/"+category
    //压缩build文件夹内容
    try{
        cp.execSync("\""+p7zip+"\" a \""+zname+"\" *",{cwd:dir+"/build"})
    }catch (err) {
        return new Interface({
            status:Status.ERROR,
            payload:"Error:Compress "+zname+" failed,skipping..."
        })
    }
    //检查压缩是否成功
    if(!fs.existsSync(dir+"/build/"+zname)){
        return new Interface({
            status:Status.ERROR,
            payload:"Error:Compress "+zname+" failed,skipping..."
        })
    }
    log("Info:Compressed successfully")

    //移动至编译仓库
    if(!fs.existsSync(repo)) fs.mkdirSync(repo)
    let moveCmd="move \""+dir+"/build/"+zname+"\" \""+repo+"/"+zname+"\""
    moveCmd=moveCmd.replace(/\//g,"\\")
    try{
        cp.execSync(moveCmd)
    }catch (err) {
        console.log(err.output.toString())
        return new Interface({
            status:Status.ERROR,
            payload:"Error:Can't move with command:"+moveCmd
        })
    }
    if(!fs.existsSync(repo+"/"+zname)){
        return new Interface({
            status:Status.ERROR,
            payload:"Error:Can't move with command:"+moveCmd
        })
    }

    //删除过旧的编译版本
    if(database.builds.length>MAX_BUILDS){
        database=removeExtraBuilds(database,repo,category)
    }
    //记录数据库
    database.latestVersion=version
    database.builds.push({
        version,
        name:zname
    })
    //上传编译版本
    if(!DISABLE_UPLOAD){
        if(!uploadToRemote(zname,category)){
            return new Interface({
                status:Status.ERROR,
                payload:"Error:Can't upload file "+zname
            })
        }
    }
    
    return new Interface({
        status:Status.SUCCESS,
        payload:database
    })
} //Interface:DatabaseNode

//scraper
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
            payload:"Warning:DOM_DOWNLOAD_BOX not found,can't scrape "+url+",skipping..."
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
            payload:"Warning:Valid dom node not found,can't scrape "+url+",skipping..."
        })
    }
    log("Info:Get valid dom node whose class is \""+dom_node.attr("class")+"\"")

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
    
    //TODO 抓取MD5

    //校验结果是否有效
    if(!result.text||!result.href){
        return new Interface({
            status:Status.ERROR,
            payload:"Warning:Null value caught in result,can't scrape "+url
        })
    }

    //处理href
    result.href=parseDownloadUrl(result.href)

    //输出提示
    log("Info:Scraped successfully")

    return new Interface({
        status:Status.SUCCESS,
        payload:result
    })
} //Interface:PageInfo

//task processor
async function processTask(task:Task,database:DatabaseNode,p7zip:string):Promise<Interface> {
    log("Info:Start processing "+task.name)

    //抓取页面信息
    let iScrape=await scrapePage(task.paUrl)
    if(iScrape.status===Status.ERROR) {
        log(iScrape.payload)
        return new Interface({
            status:Status.ERROR,
            payload:"Warning:Can't scrape "+task.name+" 's page,skipping..."
        })
    }
    let pageInfo=iScrape.payload as PageInfo

    //匹配版本号
    let iVersion=matchVersion(pageInfo.text)
    if(iVersion.status===Status.ERROR){
        log(iVersion.payload)
        return new Interface({
            status:Status.ERROR,
            payload:"Warning:Can't match "+task.name+" 's version from page,skipping..."
        })
    }
    let version=iVersion.payload as string

    //与数据库进行校对
    let ret:Interface
    switch(versionCmp(database.latestVersion,version)){
        case Cmp.L:
            //需要升级
            if(!await getWorkDirReady(task.name,pageInfo.href,p7zip,"",task.requirement)){
                ret = new Interface({
                    status:Status.ERROR,
                    payload:"Warning:Can't get "+task.name+" 's workshop ready,skipping..."
                })
                break
            }
            if(!runMakeScript(task.name)){
                ret = new Interface({
                    status:Status.ERROR,
                    payload:"Warning:Can't run "+task.name+" 's make script,skipping..."
                })
                break
            }
            let BAD_database:DatabaseNode
            try{
                BAD_database=buildAndDeliver(task.name,version,task.author,task.category,p7zip,database).unwarp()
            }catch (e) {
                console.log(JSON.stringify(e))
                ret=new Interface({
                    status:Status.ERROR,
                    payload:"Warning:Can't build or deliver "+task.name+",skipping..."
                })
                break
            }
            ret = new Interface({
                status:Status.SUCCESS,
                payload:BAD_database
            })
            break
        case Cmp.G:
            //本地大于在线，异常
            log("Warning:"+task.name+"'s local version is greater than online version,local="+database.latestVersion+",online="+version)
            ret = new Interface({
                status:Status.SUCCESS,
                payload:database
            })
            break
        default:
            //已是最新版本，不需要操作
            log("Info:"+task.name+" has been up to date,local="+database.latestVersion+",online="+version)
            ret = new Interface({
                status:Status.SUCCESS,
                payload:database
            })
            break
    }
    return ret
} //Interface:DatabaseNode

//main
//TODO 优化打印
async function main() {
    //初始化
    log("Info:Launching,please hold a second...")
    if(!beforeRunCheck()){
        throw "Initialization failed"
    }
    if(!cleanWorkshop()){
        throw "Cleaning workshop failed"
    }
    let p7zip=find7zip().unwarp()

    //读入数据库
    let DB=readDatabase()

    //读入Tasks
    let tasks:Array<string> = getTasks()

    //顺次执行任务
    let failureTasks:Array<string>=[]
    for(let i=0;i<tasks.length;i++){

        let taskName=tasks[i]

        //读取task配置
        let iRT=readTaskConfig(taskName)
        if(iRT.status===Status.ERROR){
            log("Warning:Can't read "+taskName+"'s config,skipping...")
            continue
        }
        let taskConfig=iRT.payload as Task

        //读取数据库中对应节点
        let dbNode=DB[taskName]
        if(!dbNode) dbNode=new DatabaseNode()

        //执行task
        //TODO 打印当前进度
        let iPT=await processTask(taskConfig,dbNode,p7zip)
        if(iPT.status===Status.ERROR){
            log(iPT.payload)
            failureTasks.push(taskName)
        }else{
            //task运行成功
            log("Info:Task "+taskName+" executed successfully")
            //写入数据库
            DB[taskName]=iPT.payload
        }
    }

    //总结
    console.log("\n")
    if(failureTasks.length===0){
        log("Info:All tasks are executed successfully,exit")
    }else{
        log("Warning:"+failureTasks.length+" tasks failed:"+failureTasks.toString()+",exit")
    }

    //写数据库
    saveDatabase(DB)
}

main().catch((e)=>{throw e})