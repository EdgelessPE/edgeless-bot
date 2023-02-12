import {where} from "./platform";
import shell from "shelljs";
import path from "path";
import cp from "child_process";
import {log} from "./utils";
import fs from "fs";

async function packIntoNep(
    sourceDir: string,
    intoFile: string,
): Promise<boolean> {
    log(`Info:Packing ${sourceDir} into ${intoFile}`)
    return new Promise((resolve) => {
        const ept = where("ept").unwrap();
        try {
            cp.execSync(`${ept} pack "${sourceDir}" "${intoFile}"`, {
                cwd: path.join(process.cwd(),"bin","ept"),
            });
        } catch (e) {
            log("Error:Pack command failed\n" + e);
            resolve(false);
            return;
        }
        resolve(fs.existsSync(intoFile));
    });
}

export {
    packIntoNep
}