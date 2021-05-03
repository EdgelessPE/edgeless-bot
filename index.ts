import {WebSocket as Aria2} from "libaria2-ts";
import axios from "axios";
import fs from "fs";
import cheerio from "cheerio";
import cp from "child_process";
import cpt from "crypto";
import chalk from "chalk";
import Spawn from "./bin/spawn";
import sleep from "./utils/sleep";
import ora from "ora";
import UserConfig from "./utils/config";
const ini = require("ini");
const iconv = require('iconv-lite');


export const _userConfig = new UserConfig(
    fs.readFileSync("./config.jsonc", "utf8")
);

// 远程开关
export const ENABLE_REMOTE = _userConfig.resolved.enableRemote;
// 忽略远程警告
export const IGNORE_REMOTE = _userConfig.resolved.ignoreRemote;

export const DIR_TASKS = _userConfig.resolved.dirTask;
export const DIR_WORKSHOP = _userConfig.resolved.dirWorkshop;
export const DIR_BUILDS = _userConfig.resolved.dirBuilds;
export const PATH_DATABASE = _userConfig.resolved.pathDatabase;
export const MAX_BUILDS = _userConfig.resolved.maxBuildsNum;
export const REMOTE_NAME = _userConfig.resolved.remoteName;
export const REMOTE_ROOT = _userConfig.resolved.remoteRoot;

let aria2: Aria2.Client;
let _spawn: Spawn;

//Enum
enum Status {
    SUCCESS,
    ERROR,
}

enum Cmp {
    L,
    E,
    G,
}

//Class
//函数间通讯相关
interface NaiveInterface<T> {
    status: Status;
    payload: T;
}

class Interface<T = any> {
    status: Status;
    payload: T;

    unwarp(): any {
        if (this.status === Status.ERROR) {
            let text = (this.payload as unknown) as string;
            let spl = text.split(":");
            if (spl.length < 2) {
                log("Warning:Caught illegal ERROR tip by unwarp()");
                log("Error:" + text);
                throw "EXIT";
            }
            if (spl[0] !== "Error") {
                //log("Warning:Expected ERROR tip,got " + spl[0] + " by unwarp()");
                log("Error:" + text.substring(spl[0].length + 1));
                throw "EXIT";
            }
            throw text;
        } else {
            return this.payload;
        }
    }

    constructor(config: NaiveInterface<T>) {
        this.status = config.status;
        this.payload = (config.payload as unknown) as T;
    }
}

interface PageInfo {
    text: string;
    href: string;
    md5: string;
}

//任务配置信息
class Task {
    name: string; //软件名（也作为任务名）
    category: string; //软件分类
    author: string; //打包者名称

    paUrl: string; //PortableApps网页链接
    releaseRequirement: Array<string>; //解压下载的exe后工作目录中应该出现的文件/文件夹，用于包校验
    buildRequirement:Array<string>; //构建成功时工作目录中应该出现的文件/文件夹，用于构建校验
    preprocess:boolean; //是否启用PortableApps预处理
    autoMake:boolean; //是否启用自动制作
    //useWget:boolean; //是否使用wget，默认使用aria2

    constructor() {
        this.name = "Null";
        this.category = "Null";
        this.author = "Null";
        this.paUrl = "Null";
        this.releaseRequirement = ["Null"];
        this.buildRequirement = ["Null"];
        this.preprocess=true;
        this.autoMake=true;
        //this.useWget=false;
    }
}

//数据库相关
interface BuildInfo {
    version: string;
    name: string;
}

interface BuildStatus {
    time:number;
    timeDescription:string;

    success:boolean;
    errorMessage:string;
}

class DatabaseNode {
    latestVersion: string;
    builds: Array<BuildInfo>;
    recentStatus:Array<BuildStatus>;

    constructor() {
        this.latestVersion = "0.0.0";
        this.builds = [];
        this.recentStatus=[];
    }
}

//utils

function log(text: string) {
    let spl = text.split(":");
    if (spl.length < 2) {
        console.log(chalk.yellow("Warning") + " Illegal message detected");
        console.log(text);
        return;
    }
    let inf = text.substring(spl[0].length + 1);
    switch (spl[0]) {
        case "Info":
            console.log(chalk.blue("Info ") + inf);
            break;
        case "Success":
            console.log(chalk.greenBright("Success ") + inf);
            break;
        case "Warning":
            console.log(chalk.yellow("Warning ") + inf);
            break;
        case "Error":
            console.log(chalk.red("Error ") + inf);
            break;
        default:
            console.log(chalk.yellow("Warning") + " Illegal message detected");
            console.log(text);
    }
}

async function getMD5(filePath: string): Promise<string> {
    return new Promise((resolve) => {
        let rs = fs.createReadStream(filePath);
        let hash = cpt.createHash("md5");
        let hex;
        rs.on("data", hash.update.bind(hash));
        rs.on("end", function () {
            hex = hash.digest("hex");
            log("Info:MD5 is " + hex);
            resolve(hex);
        });
    });
}

function parseDownloadUrl(href: string): string {
    //识别根目录字符“/”
    if (href[0] === "/") href = "https://portableapps.com" + href;

    //识别downloading，替换为redirect
    href=href.replace("downloading","redirect")

    //URL编码
    href=encodeURI(href)

    log("Info:Parse download link into:"+href)
    return href
}

function formatVersion(version:string):string {
    let spl=version.split(".")
    if(spl.length>4){
        log("Warning:Illegal version \""+version+",\"length="+spl.length)
        return version
    }
    //将版本号扩充为4位
    for(let i=0;i<4-spl.length;i++){
        version=version+".0"
    }

    return version
}

function matchVersion(text: string): Interface {
    let regex = /\d+.\d+(.\d+)*/;
    let matchRes = text.match(regex);
    if (!matchRes || matchRes.length === 0) {
        return new Interface({
            status: Status.ERROR,
            payload:
                'Error:Matched nothing when looking into "' +
                text +
                '" with "' +
                regex +
                '",skipping...',
        });
    }
    return new Interface({
        status: Status.SUCCESS,
        payload: matchRes[0],
    });
} //Interface:string
function versionCmp(a: string, b: string): Cmp {
    let x = a.split(".");
    let y = b.split(".");
    let result: Cmp = Cmp.E;

    for (let i = 0; i < Math.min(x.length, y.length); i++) {
        if (Number(x[i]) < Number(y[i])) {
            result = Cmp.L;
            break;
        } else if (Number(x[i]) > Number(y[i])) {
            result = Cmp.G;
            break;
        }
    }
    //处理前几位版本号相同但是位数不一致的情况，如1.3/1.3.0
    if (result === Cmp.E && x.length !== y.length) {
        //找出较长的那一个
        let t: Array<string>;
        t = x.length < y.length ? y : x;
        //读取剩余位
        for (
            let i = Math.min(x.length, y.length);
            i < Math.max(x.length, y.length);
            i++
        ) {
            if (Number(t[i]) !== 0) {
                result = x.length < y.length ? Cmp.L : Cmp.G;
                break;
            }
        }
    }

    return result;
}
function rd(dst:string):boolean {
    if (fs.existsSync(dst)) {
        try{
            dst=dst.replace(/\//g, "\\");
            cp.execSync("del /f /s /q \"" + dst+"\"");
            cp.execSync("rd /s /q \"" + dst+"\"");
        }catch (err) {
            console.log(err.output.toString())
            log("Warning:Can't remove directory "+dst)
        }
    }
    return !fs.existsSync(dst)
}
function mv(src:string,dst:string):boolean {
    src=src.replace(/\//g, "\\");
    dst=dst.replace(/\//g, "\\");
    try{
        cp.execSync("move /y \""+src+"\" \""+dst+"\"")
    }catch (err) {
        console.log(err.output.toString())
        log("Error:Can't move "+src+" to "+dst)
        return false
    }
    return fs.existsSync(dst)
}
function xcopy(src:string,dst:string):boolean {
    //demo:xcopy /s /r /y .\Edgeless %PA_Part%:\Edgeless\

    src=src.replace(/\//g, "\\");
    dst=dst.replace(/\//g, "\\");
    try{
        cp.execSync("xcopy /s /r /y \""+src+"\" \""+dst+"\"")
    }catch (err) {
        console.log(err.output.toString())
        log("Error:Can't copy "+src+" to "+dst)
        return false
    }
    return fs.existsSync(dst)
}
function cleanBuildStatus(s:Array<BuildStatus>):Array<BuildStatus> {
    //按照时间降序排列
    s.sort((a,b)=>{
        return b.time-a.time
    })

    return s.slice(0,3)
}
function gbk(buffer:Buffer):string {
    return iconv.decode(buffer,'GBK')
}

//helper
function preprocessPA(name:string):boolean {
    let dir=DIR_WORKSHOP+"/"+name+"/release"
    //删除$PLUGINSDIR
    if(!fs.existsSync(dir+"/$PLUGINSDIR")||!rd(dir+"/$PLUGINSDIR")){
        log("Error:Can't preprocess "+name+":remove $PLUGINSDIR failed")
        return false
    }
    //修改pac_installer_log.ini
    let filePath=dir+"/App/AppInfo/pac_installer_log.ini"
    if(!fs.existsSync(filePath)){
        log("Error:Can't preprocess "+name+":pac_installer_log.ini not found")
        return false
    }
    let fileContent=ini.parse(fs.readFileSync(filePath).toString()).PortableApps.comInstaller
    if(!fileContent){
        log("Error:Can't preprocess "+name+":[PortableApps.comInstaller] not found in pac_installer_log.ini")
        return false
    }
    try{
        fileContent.Info2="This file was generated by the PortableApps.com Installer wizard and modified by the official PortableApps.com Installer TM Rare Ideas, LLC as the app was installed."
        fileContent.Run="true"
        fileContent.InstallerVersion=fileContent.WizardVersion
        fileContent.InstallDate=fileContent.PackagingDate
        fileContent.InstallTime=fileContent.PackagingTime

        let final="[PortableApps.comInstaller]\n"+ini.stringify(fileContent)
        fs.writeFileSync(filePath,final)
    }catch (err) {
        console.log(JSON.stringify(err))
        log("Error:Can't preprocess "+name+":can't modify pac_installer_log.ini")
        return false
    }

    log("Info:Preprocessed "+name+" successfully")
    return true
}

function removeExtraBuilds(
    database: DatabaseNode,
    repo: string,
    category: string
): DatabaseNode {
    //builds降序排列
    database.builds.sort((a, b) => {
        return 1 - versionCmp(a.version, b.version);
    });
    //删除多余的builds
    for (let i = 0; i < database.builds.length - MAX_BUILDS; i++) {
        let target = database.builds.pop();
        if (typeof target !== "undefined") {
            log("Info:Remove extra build " + repo + "/" + target.name);
            fs.unlinkSync(repo + "/" + target.name);
            if (!deleteFromRemote(target.name, category)) {
                log("Warning:Fail to delete remote extra build " + target.name);
            }
        }
    }

    return database;
}

//remote

function uploadToRemote(zname: string, category: string): boolean {
    if (ENABLE_REMOTE) {
        let localPath = DIR_BUILDS + "/" + category + "/" + zname;
        let remotePath = REMOTE_ROOT + "/" + category;

        try {
            cp.execSync(
                'rclone copy "' + localPath + '" ' + REMOTE_NAME + ":" + remotePath
            );
        } catch (err) {
            console.log(err.output.toString());
            return false;
        }
    } else if (!IGNORE_REMOTE) log("Warning:Remote disabled,skip upload to remote");
    return true;
}

function deleteFromRemote(zname: string, category: string): boolean {
    if (ENABLE_REMOTE) {
        let remotePath = REMOTE_ROOT + "/" + category + "/" + zname;

        try {
            cp.execSync("rclone delete " + REMOTE_NAME + ":" + remotePath);
        } catch (err) {
            console.log(err.output.toString());
            return false;
        }
    } else if (!IGNORE_REMOTE) log("Warning:Remote disabled,skip delete from remote");
    return true;
}

interface RunChecker {
    cmd: string;
    hint: string;
    onerror: (displayError: () => boolean) => boolean | void;
}

//init
function beforeRunCheck(): boolean {
    //预设严重错误函数
    let l = function (text: string): boolean {
        log("Error:Check failure, " + text);
        return false;
    };

    //检查是否在Windows中
    if (!fs.existsSync("C:\\Windows\\System32")) {
        return l("Please run inside Windows");
    }
    //检查目录中文件夹是否到位
    let dirList: Array<string> = [DIR_BUILDS, DIR_TASKS];
    dirList.forEach((path) => {
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
            if (!fs.existsSync(path)) {
                return l("Can't create folder " + path);
            }
        }
    });
    //检查命令可用性
    let cmdList: Array<RunChecker> = [
        {
            cmd: "rclone",
            hint: "rclone",
            onerror: (d) => {
                if (!IGNORE_REMOTE) {
                    d();
                    log("Warning:Command `rclone` not found, remote disabled");
                }
                return true;
            },
        },
    ];
    cmdList.forEach((item) => {
        try {
            cp.execSync("where " + item.cmd, {
                stdio: "ignore",
            });
        } catch (err) {
            console.log(err.output.toString())
            return (
                item.onerror(() =>
                    l(
                        "Command `" +
                        item.cmd +
                        "` not found" +
                        ", please install " +
                        item.hint +
                        "\nTry `scoop install " +
                        item.hint +
                        "` if you have scoop installed"
                    )
                ) ?? false
            );
        }
    });

    return true;
}

function cleanWorkshop(): boolean {
    let dst = DIR_WORKSHOP.substring(2);
    if (!rd(dst)) {
        log("Error:Can't remove workshop,kill running processes and retry");
        return false;
    }
    fs.mkdirSync(dst);
    return fs.existsSync(dst);
}

function find7zip(): Interface {
    let possiblePath = [
        "C:\\Program Files\\7-Zip\\7z.exe",
        "C:\\Program Files (x86)\\7-Zip\\7z.exe",
        process.env.WINDIR + "\\system32\\7z.exe",
        process.env.PROGRAMFILESW6432 + "\\7-Zip\\7z.exe",
        ...(process.env["ProgramFiles(x86)"] != undefined
            ? [process.env["ProgramFiles(x86)"] + "\\7-Zip\\7z.exe"]
            : []),
        "7z.exe",
        "7za.exe",
    ];
    let result = null;
    for (let i in possiblePath) {
        if (fs.existsSync(possiblePath[i])) {
            result = possiblePath[i];
            break;
        }
    }
    if (!result) {
        return new Interface({
            status: Status.ERROR,
            payload:
                "Error:7-Zip not found,please install 7-Zip from https://www.7-zip.org",
        });
    } else {
        return new Interface({
            status: Status.SUCCESS,
            payload: result,
        });
    }
} //Interface:string

//database
function readDatabase(): any {
    let dst = PATH_DATABASE;
    if (!fs.existsSync(dst)) {
        return {};
    } else {
        return JSON.parse(fs.readFileSync(dst).toString());
    }
}

function saveDatabase(json: any) {
    let dst = PATH_DATABASE;
    if (fs.existsSync(dst)) {
        if (fs.existsSync(dst + ".bak")) fs.rmSync(dst + ".bak");
        fs.renameSync(dst, dst + ".bak");
    }

    fs.writeFileSync(dst, JSON.stringify(json));
}

//task
function getTasks(): Array<string> {
    let dst = DIR_TASKS;
    let fileList = fs.readdirSync(dst);
    let result: string[] = [];
    fileList.forEach((item) => {
        if (fs.statSync(dst + "/" + item).isDirectory()) result.push(item);
    });
    return result;
}

function readTaskConfig(name: string): Interface {
    let dir = DIR_TASKS + "/" + name;

    //判断Task文件夹合法性
    if (
        !fs.existsSync(dir + "/config.json")
    ) {
        return new Interface({
            status: Status.ERROR,
            payload: "Warning:Skipping illegal task directory " + name,
        });
    }

    //解析Json
    let json = JSON.parse(fs.readFileSync(dir + "/config.json").toString());

    //检查文件夹名称和json.name是否一致
    if (name !== json.name) {
        return new Interface({
            status: Status.ERROR,
            payload: 'Error:Value of config\'s key "name" is not ' + name,
        });
    }

    //检查Json健全性
    let miss = null;
    for (let taskKey in new Task()) {
        if (!json.hasOwnProperty(taskKey)) {
            miss = taskKey;
            break;
        }
    }
    if (miss) {
        return new Interface({
            status: Status.ERROR,
            payload:
                "Warning:Skipping illegal task config " +
                name +
                ',missing "' +
                miss +
                '"',
        });
    }

    return new Interface({
        status: Status.SUCCESS,
        payload: json,
    });
} //Interface:Task
async function getWorkDirReady(
    task: Task,
    pageInfo: PageInfo,
    p7zip: string
): Promise<Interface> {
    let name=task.name
    let req=task.releaseRequirement
    let url=pageInfo.href
    let md5=pageInfo.md5
    let dir = DIR_WORKSHOP + "/" + name;

    //创建目录，因为程序初始化时会将workshop目录重建
    fs.mkdirSync(dir);
    fs.mkdirSync(dir + "/" + "build");

    //通过aria2/wget下载
    log("Info:Start downloading " + name);
    try {
        //cp.execSync("wget -O target.exe " + url, {cwd: dir});
        let gid = await aria2.addUri(
            url,
            {
                dir: dir,
                out: "target.exe",
            },
            0
        );
        let done = false;
        let progress = ora({
            text: "Downloading " + name + ", waiting...",
            prefixText: chalk.blue("Info"),
        });
        progress.start();
        while (!done) {
            await sleep(500);
            let status = await aria2.tellStatus(gid);
            if (status.status == "error") throw status;
            if (status.status == "complete") done = true;
            if (status.status == "waiting") {
                await sleep(1000);
            }
            progress.text =
                "Download Progress: " +
                (Number(status.completedLength as bigint) / 1024 / 1024).toPrecision(
                    3
                ) +
                " / " +
                (Number(status.totalLength as bigint) / 1024 / 1024).toPrecision(3) +
                " MiB, Speed: " +
                (Number(status.downloadSpeed as bigint) / 1024 / 1024).toPrecision(3) +
                " MiB/s";
        }
        progress.succeed(name + " Downloaded.");
    } catch (err) {
        console.log(err.output.toString());
        return new Interface({
            status:Status.ERROR,
            payload:"Error:Downloading " + name + " failed,skipping..."
        })
    }

    //校验下载
    if (!fs.existsSync(dir + "/target.exe")) {
        return new Interface({
            status:Status.ERROR,
            payload:"Error:Downloading " + name + " failed,skipping..."
        })
    }

    //校验md5
    if (md5&&md5 !== "") {
        let md5_calc = await getMD5(dir + "/target.exe");
        if (md5.toLowerCase() !== md5_calc.toLowerCase()) {
            return new Interface({
                status:Status.ERROR,
                payload:                "Error:Task " +
                    name +
                    " 's MD5 checking failed,expected " +
                    md5 +
                    ",got " +
                    md5_calc +
                    ",skipping..."
            })
        }
    }

    //使用7-Zip解压至release文件夹
    log("Info:Start extracting " + name);
    cp.execSync('"' + p7zip + '" x target.exe -orelease -y', {cwd: dir});

    //检查目录是否符合规范
    let miss = null;
    for (let i in req) {
        let n = req[i];
        if (!fs.existsSync(dir + "/release/" + n)) {
            miss = n;
            break;
        }
    }
    if (miss) {
        return new Interface({
            status:Status.ERROR,
            payload:"Error:Miss " + miss + " in " + name + "'s workshop,skipping..."
        })
    }

    //复制make.cmd
    if(fs.existsSync(DIR_TASKS + "/" + name + "/make.cmd")) {
        try{
            fs.copyFileSync(DIR_TASKS + "/" + name + "/make.cmd", dir + "/make.cmd")
        }catch (err) {
            return new Interface({
                status:Status.ERROR,
                payload:"Error:Can't copy make.cmd for task "+name
            })
        }
    }

    //复制utils
    if(fs.existsSync(DIR_TASKS + "/" + name + "/utils")) {
        if(!xcopy(DIR_TASKS + "/" + name + "/utils", dir + "/utils/")){
            return new Interface({
                status:Status.ERROR,
                payload:"Error:Can't copy utils for task "+name
            })
        }
    }

    //复制cover
    if(fs.existsSync(DIR_TASKS + "/" + name + "/cover")) {
        if(!xcopy(DIR_TASKS + "/" + name + "/cover", dir + "/cover/")){
            return new Interface({
                status:Status.ERROR,
                payload:"Error:Can't copy cover for task "+name
            })
        }
    }

    log("Info:Workshop for " + name + " is ready");
    return new Interface({
        status:Status.SUCCESS,
        payload:"Success"
    })
} //Interface:string

async function runMakeScript(name: string): Promise<Interface> {
    return new Promise<Interface>((resolve)=>{
        //校验是否存在make.cmd
        if(!fs.existsSync(DIR_WORKSHOP + "/" + name+"/make.cmd")){
            resolve(new Interface({
                status:Status.ERROR,
                payload:"Error:make.cmd not found for task "+name
            }))
        }

        log("Info:Start making " + name);

        //生成bot_start.cmd
        fs.writeFileSync(DIR_WORKSHOP + "/" + name+"/bot_start.cmd","cmd /c make.cmd>make.log\nexit")

        //超时检查(10min)
        let timeLimit=600000
        let deadline=Date.now()+timeLimit
        let interval:NodeJS.Timeout
        interval=setInterval(()=>{
            if(deadline<Date.now()){
                log("Info:Finish make,cost "+((deadline-timeLimit)/1000)+"s")
                clearInterval(interval)
                resolve(new Interface({
                    status:Status.ERROR,
                    payload:"Error:Make timeout for " + name
                }))
            }
        },60000)

        //启动make.cmd进程
        let exec=cp.exec("start /wait bot_start.cmd", {cwd: DIR_WORKSHOP + "/" + name},(err,_out,_err)=>{
            //中断定时器
            clearInterval(interval)

            //尝试输出make.cmd的控制台信息
            if(fs.existsSync(DIR_WORKSHOP + "/" + name+"/make.log")){
                console.log(gbk(fs.readFileSync(DIR_WORKSHOP + "/" + name+"/make.log")))
            }else{
                log("Warning:make.cmd has no console output")
            }

            //判断执行是否出错
            if(err==null){
                log("Info:Finish making " + name);

                //校验目录可靠性
                let dirFiles = fs.readdirSync(DIR_WORKSHOP + "/" + name + "/build");
                let miss = true;
                for (let i in dirFiles) {
                    if (dirFiles[i].match(".wcs") || dirFiles[i].match(".cmd")) {
                        miss = false;
                        break;
                    }
                }
                if (miss) {
                    resolve(new Interface({
                        status:Status.ERROR,
                        payload:"Error:Illegal directory build from " + name
                    }))
                }

                //成功
                resolve(new Interface({
                    status:Status.SUCCESS,
                    payload:"Success"
                }))
            }else{
                resolve(new Interface({
                    status:Status.ERROR,
                    payload:"Error:Make error for " + name
                }))
            }
        });

    })
}

function autoMake(name:string):boolean {
    log("Info:Start auto make "+name)
    let dir=DIR_WORKSHOP+"/"+name+"/release"

    //扫描exe文件
    let files:Array<string>=fs.readdirSync(dir)

    //找出可执行文件
    let exeFileName:string=""
    files.forEach((item)=>{
        if(item.includes(".exe")){
            log("Info:Got exe file:"+item)
            exeFileName=item
        }
    })
    if(exeFileName!==""){
        //检查是否包含"Portable"
        if(!exeFileName.includes("Portable")){
            log("Warning:Exe file may be wrong:"+exeFileName)
        }

        //生成wcs文件
        let cmd="LINK X:\\Users\\Default\\Desktop\\"+name+",X:\\Program Files\\Edgeless\\"+name+"_bot\\"+exeFileName
        fs.writeFileSync(DIR_WORKSHOP+"/"+name+"/build/"+name+"_bot.wcs",cmd)
        log("Info:Save batch with command:"+cmd)

        //移动文件夹
        if(!mv(DIR_WORKSHOP+"/"+name+"/release",DIR_WORKSHOP+"/"+name+"/build/"+name+"_bot")){
            return false
        }

        log("Info:Auto make executed successfully")
        return true
    }else{
        log("Error:Can't find exe file,auto make failed")
        return false
    }
}

function buildAndDeliver(
    task: Task,
    version: string,
    p7zip: string,
    database: DatabaseNode
): Interface {
    let name=task.name
    let category=task.category
    let author=task.author
    let req=task.buildRequirement
    let zname = name + "_" + version + "_" + author + "（bot）.7z";
    let dir = DIR_WORKSHOP + "/" + name;
    let repo = DIR_BUILDS + "/" + category;
    //检查build requirements
    let miss = null;
    for (let i in req) {
        let n = req[i];
        if (!fs.existsSync(dir + "/build/" + n)) {
            miss = n;
            break;
        }
    }
    if (miss) {
        return new Interface({
            status:Status.ERROR,
            payload:"Error:Miss " + miss + " in " + name + "'s final build,skipping..."
        })
    }

    //压缩build文件夹内容
    log("Info:Start compressing into "+zname)
    try {
        cp.execSync('"' + p7zip + '" a "' + zname + '" *', {cwd: dir + "/build"});
    } catch (err) {
        console.log(err.output.toString())
        return new Interface({
            status: Status.ERROR,
            payload: "Error:Compress " + zname + " failed,skipping...",
        });
    }
    //检查压缩是否成功
    if (!fs.existsSync(dir + "/build/" + zname)) {
        return new Interface({
            status: Status.ERROR,
            payload: "Error:Compress " + zname + " failed,skipping...",
        });
    }
    log("Info:Compressed successfully");

    //移动至编译仓库
    if (!fs.existsSync(repo)) fs.mkdirSync(repo);
    let moveCmd =
        'move "' + dir + "/build/" + zname + '" "' + repo + "/" + zname + '"';
    moveCmd = moveCmd.replace(/\//g, "\\");
    try {
        cp.execSync(moveCmd);
    } catch (err) {
        console.log(err.output.toString());
        return new Interface({
            status: Status.ERROR,
            payload: "Error:Can't move with command:" + moveCmd,
        });
    }
    if (!fs.existsSync(repo + "/" + zname)) {
        return new Interface({
            status: Status.ERROR,
            payload: "Error:Can't move with command:" + moveCmd,
        });
    }

    //删除过旧的编译版本
    if (database.builds.length > MAX_BUILDS) {
        database = removeExtraBuilds(database, repo, category);
    }
    //记录数据库
    database.latestVersion = version;
    database.builds.push({
        version,
        name: zname,
    });
    //上传编译版本
    if (!uploadToRemote(zname, category)) {
        return new Interface({
            status: Status.ERROR,
            payload: "Error:Can't upload file " + zname,
        });
    }

    return new Interface({
        status: Status.SUCCESS,
        payload: database,
    });
} //Interface:DatabaseNode

async function spawnAria2() {
    if (_userConfig.resolved.spawnAria2) {
        _spawn = new Spawn(_userConfig);
        _spawn.all();
        _spawn.promise().catch((e) => {
            console.error(e);
            throw e;
        });
        await sleep(1500);
    }
    aria2 = new Aria2.Client({
        host: _userConfig.resolved.aria2Host,
        port: _userConfig.resolved.aria2Port,
        auth: {
            secret: _userConfig.resolved.aria2Secret,
        },
    });
    try {
        let ver = await aria2.getVersion();
        log("Info:Aria2 ready, ver = " + ver.version);
        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
}

//scraper,enable useFS when debugging that the function will load page ./1.html
async function scrapePage(
    url: string,
    useFS: boolean
): Promise<Interface<PageInfo>> {
    let result = ({} as unknown) as PageInfo;

    //配置可识别的类名
    let validClassName = [".download-link", ".download-info"];

    //获取HTML信息并挂载
    log("Info:Start scraping page: " + url);
    let res;
    try {
        if (!useFS) res = await axios.get(url);
    } catch (err) {
        console.log(JSON.stringify(err))
        return new Interface({
            status: Status.ERROR,
            payload: (("Error:Http status code abnormal,can't scrape " +
                url +
                " ,message:" +
                err.message) as unknown) as PageInfo,
        });
    }

    //挂载HTML
    let $ = cheerio.load(
        useFS ? fs.readFileSync("./1.html").toString() : res?.data
    );

    //获取download-box DOM
    let dom_box = $(".download-box");

    //判断dom_box是否有效
    if (!dom_box) {
        return new Interface({
            status: Status.ERROR,
            payload: (("Error:DOM_DOWNLOAD_BOX not found,can't scrape " +
                url +
                ",skipping...") as unknown) as PageInfo,
        });
    }

    //获取有效节点
    let dom_node: cheerio.Cheerio = ({} as unknown) as cheerio.Cheerio;
    for (let i in validClassName) {
        dom_node = dom_box.children(validClassName[i]);
        if (dom_node.attr("class")) break;
    }

    //判断dom_node是否有效
    if (!dom_node.attr("class")) {
        return new Interface({
            status: Status.ERROR,
            payload: (("Error:Valid dom node not found,can't scrape " +
                url +
                ",skipping...") as unknown) as PageInfo,
        });
    }
    log(
        'Info:Get valid dom node whose class is "' + dom_node.attr("class") + '"'
    );

    //尝试获取MD5
    let md5TagResult = $("strong:contains('MD5')");
    if (md5TagResult.length === 0) {
        log("Warning:No MD5 tag found in this page");
    } else {
        try {
            result.md5 = md5TagResult
                .parent("li")
                .get(0)
                .children[1].data.substring(2);
        } catch (err) {
            console.log(JSON.stringify(err))
            log("Warning:Fail to get MD5 value");
        }
    }

    //分className处理，获取text和href
    switch (dom_node.attr("class")) {
        case "download-link":
            result.text = dom_node.text();
            result.href = dom_node.attr("href") as string;
            break;
        case "download-info":
            //获取box的首个子节点
            let dom_btn = dom_box.children("a");

            //产生两个属性
            result.text = dom_node.text();
            result.href = dom_btn.attr("href") as string;

            //查询是否为多语言
            if (result.text.match(/Multilingual/) == null) {
                //匹配是否为英文
                if (result.text.match(/English/)) {
                    //尝试获取多语言下载列表
                    log(
                        "Info:English application detected,trying to match simplified chinese version"
                    );
                    let table = $(".zebra.download-links");
                    if (table.length > 0) {
                        //获取简体中文下载地址
                        let recordParent = table
                            .find("td:contains('Simplified')")
                            .parent("tr");
                        if (recordParent.length > 0) {
                            //获得下载地址
                            result.href = recordParent.find("a").get(0).attribs.href;
                            //尝试获得md5
                            try {
                                result.md5 = recordParent
                                    .children("td")
                                    .get(3).children[0].data;
                            } catch (err) {
                                console.log(JSON.stringify(err))
                                log("Warning:Fail to got md5");
                            }
                            log(
                                "Info:Found simplified chinese version\nmd5:" +
                                result.md5 +
                                "\ndownload link:" +
                                result.href
                            );
                        } else {
                            log(
                                "Warning:Simplified chinese version not found,use English version"
                            );
                        }
                    } else {
                        log("Warning:Localizations table not found,use English version");
                    }
                } else {
                    log(
                        "Warning:Detected minority language application,check the default language of " +
                        url
                    );
                }
            }
            break;
    }

    //校验结果是否有效
    if (!result.text || !result.href) {
        return new Interface({
            status: Status.ERROR,
            payload: (("Error:Null value caught in result,can't scrape " +
                url) as unknown) as PageInfo,
        });
    }

    //校验md5
    if (result.md5 == undefined) result.md5 = "";
    if (
        result.md5 !== "" &&
        result.md5.match(/([a-f\d]{32}|[A-F\d]{32})/) == null
    ) {
        log("Warning:Fail to check md5,got " + result.md5);
        result.md5 = "";
    }

    //处理href
    result.href = parseDownloadUrl(result.href);

    //输出提示
    log(
        "Info:Scraped successfully,got\ntext: " +
        result.text +
        "\ndownload link: " +
        result.href
    );
    if (result.md5 !== "") console.log("md5: " + result.md5 ?? "none");

    return new Interface({
        status: Status.SUCCESS,
        payload: result,
    });
} //Interface:PageInfo

//task processor
async function processTask(
    task: Task,
    database: DatabaseNode,
    p7zip: string
): Promise<Interface> {
    log("Info:Start processing " + task.name);

    //抓取页面信息
    let iScrape = await scrapePage(task.paUrl, false);
    if (iScrape.status === Status.ERROR) {
        log(iScrape.payload as any);
        return new Interface({
            status: Status.ERROR,
            payload: (("Error:Can't scrape " +
                task.name +
                " 's page,skipping...") as unknown) as PageInfo,
        });
    }
    let pageInfo = iScrape.payload as PageInfo;

    //匹配版本号
    let iVersion = matchVersion(pageInfo.text);
    if (iVersion.status === Status.ERROR) {
        log(iVersion.payload);
        return new Interface({
            status: Status.ERROR,
            payload:
                "Error:Can't match " +
                task.name +
                " 's version from page,skipping...",
        });
    }
    let version = formatVersion(iVersion.payload) as string;

    //与数据库进行校对
    let ret: Interface;
    switch (versionCmp(database.latestVersion, version)) {
        case Cmp.L:
            //需要升级
            let iGWR= await getWorkDirReady(task,pageInfo,p7zip)
            if (iGWR.status===Status.ERROR) {
                ret = iGWR
                break;
            }
            if(task.preprocess&&!preprocessPA(task.name)){
                ret = new Interface({
                    status: Status.ERROR,
                    payload:
                        "Error:Can't preprocess " + task.name + ",skipping...",
                });
                break;
            }
            if(task.autoMake){
                if(!autoMake(task.name)){
                    ret = new Interface({
                        status: Status.ERROR,
                        payload:
                            "Error:Can't make " + task.name + " automatically,skipping...",
                    });
                    break;
                }
            }else{
                let iRM=await runMakeScript(task.name)
                if (iRM.status===Status.ERROR) {
                    ret = iRM
                    break;
                }
            }
            let BAD_database: DatabaseNode;
            try {
                BAD_database = buildAndDeliver(
                    task,
                    version,
                    p7zip,
                    database
                ).unwarp();
            } catch (e) {
                ret = new Interface({
                    status: Status.ERROR,
                    payload:e,
                });
                break;
            }
            ret = new Interface({
                status: Status.SUCCESS,
                payload: BAD_database,
            });
            break;
        case Cmp.G:
            //本地大于在线，异常
            log(
                "Warning:" +
                task.name +
                "'s local version is greater than online version,local=" +
                database.latestVersion +
                ",online=" +
                version
            );
            ret = new Interface({
                status: Status.SUCCESS,
                payload: database,
            });
            break;
        default:
            //已是最新版本，不需要操作
            log(
                "Info:" +
                task.name +
                " has been up to date,local=" +
                database.latestVersion +
                ",online=" +
                version
            );
            ret = new Interface({
                status: Status.SUCCESS,
                payload: database,
            });
            break;
    }
    return ret;
} //Interface:DatabaseNode

//main
async function main() {
    console.clear();

    //获取版本号
    let project_ver="0.0.0"
    if(fs.existsSync("./package.json")){
        project_ver=JSON.parse(fs.readFileSync("./package.json").toString()).version
    }
    console.log(
        chalk.cyan.bold("Edgeless Bot ver."+project_ver)
    );

    //初始化
    log("Info:Launching,please hold a second...");
    if (!beforeRunCheck()) {
        throw "Initialization failed";
    }
    if (!cleanWorkshop()) {
        throw "Cleaning workshop failed";
    }

    if (!(await spawnAria2())) {
        throw "Spawn Aria2 failed";
    }

    let p7zip = find7zip().unwarp();

    //读入数据库
    let DB = readDatabase();
    log("Info:Get database as follow:")
    console.log(JSON.stringify(DB))

    //校验数据库
    let null_db_node=new DatabaseNode()
    for (let dbKey in DB) {
        let node=DB[dbKey] as DatabaseNode
        for (let nodeKey in null_db_node) {
            if(!node.hasOwnProperty(nodeKey)){
                log("Error:Database check failure,"+dbKey+"'s key "+nodeKey+" not defined")
                throw "Database check failure"
            }
        }
    }

    //读入Tasks
    let tasks: Array<string> = getTasks();
    log("Info:Got " + tasks.length+" tasks in queue");

    //顺次执行任务
    let failureTasks: Array<string> = [];
    for (let i = 0; i < tasks.length; i++) {
        console.log("\nProgress:"+(i+1)+"/"+tasks.length)

        let taskName = tasks[i];

        //读取task配置
        let iRT = readTaskConfig(taskName);
        if (iRT.status === Status.ERROR) {
            log("Error:Can't read " + taskName + "'s config,skipping...");

            //读取数据库中对应节点
            let dbNode = DB[taskName] as DatabaseNode;
            if (!dbNode) dbNode = new DatabaseNode();

            //记录错误
            failureTasks.push(taskName);

            //写数据库构建情况
            dbNode.recentStatus.push({
                time:Date.now(),
                timeDescription:Date(),

                success:false,
                errorMessage:"Error:Can't read " + taskName + "'s config:"+iRT.payload
            })
            DB[taskName]=dbNode
            continue;
        }
        let taskConfig = iRT.payload as Task;

        //读取数据库中对应节点
        let dbNode = DB[taskName] as DatabaseNode;
        if (!dbNode) dbNode = new DatabaseNode();

        //清理过多的构建状态信息
        if(dbNode.recentStatus.length>3){
            dbNode.recentStatus=cleanBuildStatus(dbNode.recentStatus)
        }

        //执行task
        let iPT = await processTask(taskConfig, dbNode, p7zip);
        if (iPT.status === Status.ERROR) {
            //打印错误
            log(iPT.payload);

            //记录错误
            failureTasks.push(taskName);

            //写数据库构建情况
            dbNode.recentStatus.push({
                time:Date.now(),
                timeDescription:Date(),

                success:false,
                errorMessage:iPT.payload
            })
            DB[taskName]=dbNode
        } else {
            //task运行成功
            log("Success:Task " + taskName + " executed successfully");
            //写入数据库
            let node=iPT.payload as DatabaseNode
            node.recentStatus.push({
                time:Date.now(),
                timeDescription:Date(),

                success:true,
                errorMessage:"Success"
            })
            DB[taskName]=node
        }
    }

    //总结
    console.log("=========================================");
    if (failureTasks.length === 0) {
        log("Info:Everything is Okay");
    } else {
        log(
            "Warning:" +
            failureTasks.length +
            " tasks failed as follow:" +
            failureTasks.toString()
        );
    }

    //写数据库
    saveDatabase(DB);

    //停止aria2进程
    await aria2.forceShutdown();
    log("Info:Aria2 assassinated,exit");
}

main().catch((e) => {throw e});