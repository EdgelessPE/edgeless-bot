import fs from "fs";
import path from "path";
import {Err, Result} from "ts-results";
import {TaskInstance} from "./class";
import {config} from "./config";
import toml from "toml";

function validateConfig(task: any): boolean {

}

function getSingleTask(taskName: string): Result<TaskInstance, string> {
    const taskConfigFile = path.join(process.cwd(), config.DIR_TASKS, taskName, "config.toml")
    if (!fs.existsSync(path.join(taskConfigFile))) {
        return new Err("Error:Can't find config.toml for " + taskName)
    } else {
        const text = fs.readFileSync(taskConfigFile).toString()
        let json
        try {
            json = toml.parse(text) as any
        } catch (e) {
            console.log(JSON.stringify(e))
            return new Err("Error:Can't parse config.toml for " + taskName)
        }
        if (!validateConfig(json)) {
            return new Err("Error:Can't validate config.toml for " + taskName)
        } else {
            let res = {}
            res["name"] =
        }
    }

}

function getAllTasks(): Result<Array<TaskInstance>, string> {
    const tasksDir = path.join(process.cwd(), config.DIR_TASKS)
    if (!fs.existsSync(tasksDir)) {
        return new Err("Error:Task directory not exist : " + tasksDir)
    }
    let dirList = fs.readdirSync(tasksDir)
    let result = [], success = true
    for (let taskName of dirList) {

    }
}
