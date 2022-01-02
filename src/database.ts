import fs from 'fs'
import {DatabaseNode} from "./class";
import {log} from "./utils";
import {config} from "./config";

let database: any = null, modified = false

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
    if (modified) {
        fs.writeFileSync(config.DATABASE_PATH, JSON.stringify(database, null, 2))
    }
}

//需要在read后调用
function getDatabaseNode(taskName:string):DatabaseNode{
    if(database.hasOwnProperty(taskName)) {
        let node = database[taskName]
        node["taskName"] = taskName
        return node
    }else {
        return {
            taskName,
            recent: {
                health: 3,
                latestVersion: "0.0.0.0",
                errorMessage: "No error yet",
                builds: []
            }
        }
    }
}

//需要在read后调用
function setDatabaseNodeFailure(taskName: string, errorMessage: string) {
    let old = database[taskName] as DatabaseNode
    database[taskName] = {
        recent: {
            health: (old.recent.health > 0) ? (old.recent.health--) : 0,
            latestVersion: old.recent.latestVersion,
            errorMessage,
            builds: old.recent.builds
        }
    }
    modified = true
}

function setDatabaseNodeSuccess(taskName: string, newBuilds: Array<string>) {
    let old = database[taskName] as DatabaseNode
    database[taskName] = {
        recent: {
            health: (old.recent.health == 3) ? 3 : (old.recent.health++),
            latestVersion: getVersion(newBuilds[0]),
            errorMessage: old.recent.errorMessage,
            builds: newBuilds
        }
    }
    modified = true
}

function getVersion(fullName: string): string {
    return fullName.split("_")[1]
}

export {
    readDatabase,
    writeDatabase,
    getDatabaseNode,
    setDatabaseNodeSuccess,
    setDatabaseNodeFailure
}
