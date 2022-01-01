import fs from 'fs'
import {DatabaseNode} from "./class";
import {log} from "./utils";
import {config} from "./config";

let database:any=null

//初始化时调用
function readDatabase() {
    if(!fs.existsSync(config.DATABASE_PATH)) {
        log("Warning:Database file not found,create new one")
        database={}
        return
    }
    let text=fs.readFileSync(config.DATABASE_PATH).toString()
    database=JSON.parse(text)
}

//保存数据库
function writeDatabase() {
    fs.writeFileSync(config.DATABASE_PATH,JSON.stringify(database, null, 2))
}

//需要在read后调用
function getDatabaseNode(taskName:string):DatabaseNode{
    if(database.hasOwnProperty(taskName)) {
        return database[taskName]
    }else {
        return {
            taskName,
            recent:{
                health:3,
                errorMessage:"No error yet",
                builds:[]
            }
        }
    }
}

//需要在read后调用
function setDatabaseNode(taskName:string,node:DatabaseNode){
    database[taskName]=node
}
