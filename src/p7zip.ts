import cp from "child_process";
import fs from "fs";
import {where} from "./platform";
import path from "path";
import {log} from "./utils";

const shell = require("shelljs")

async function release(file: string, intoDir: string, cwd: string, overwrite?: boolean): Promise<boolean> {
    return new Promise((resolve => {
        const p7zip = where("p7zip").unwrap()
        let aID = path.join(cwd, intoDir)
        if (overwrite && fs.existsSync(aID)) {
            if (fs.existsSync(aID)) shell.rm("-rf", aID)
            shell.mkdir("-p", aID)
        }
        try {
            cp.execSync(`${p7zip} x ${file} -o${intoDir} -y`, {cwd})
        } catch (e) {
            log("Error:Release command failed\n" + e)
            resolve(false)
            return
        }
        resolve(fs.existsSync(path.join(cwd, intoDir)))
    }))
}

async function compress(choosePlainDir: string, file: string, cwd: string, compressLevel: number): Promise<boolean> {
    return new Promise((resolve => {
        const p7zip = where("p7zip").unwrap()
        shell.mkdir("-p", cwd)
        shell.rm("-f", path.join(cwd, file))
        try {
            cp.execSync(`${p7zip} a -mx${compressLevel} ../${file} *`, {cwd: path.join(cwd, choosePlainDir)})
        } catch (e) {
            log("Error:Compress command failed\n" + e)
            resolve(false)
            return
        }
        resolve(fs.existsSync(path.join(cwd, file)))
    }))
}

export {
    release,
    compress
}
