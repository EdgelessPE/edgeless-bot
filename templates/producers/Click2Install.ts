import {ProducerParameters, ProducerReturned} from "../../src/class";
import fs from "fs";
import {Err, Ok, Result} from "ts-results";
import path from "path";
import {toGBK} from "../../src/utils";

const shell = require("shelljs")

interface RequiredObject {
    shortcutName: string
}

export default async function (p: ProducerParameters): Promise<Result<ProducerReturned, string>> {
    const {workshop, downloadedFile, requiredObject, taskName} = p
    const {shortcutName} = (requiredObject as RequiredObject)
    const ready = path.join(workshop, "ready")

    shell.cd(workshop)
    shell.mkdir('-p', `ready/${taskName}`)
    shell.mv(downloadedFile, `ready/${taskName}/`)
    fs.writeFileSync(path.join(ready, taskName + ".wcs"), toGBK(`LINK X:\\Users\\Default\\Desktop\\${shortcutName},%ProgramFiles%\\Edgeless\\${taskName}\\${downloadedFile}`))

    const exist = function (p: string): boolean {
        return fs.existsSync(path.join(ready, p))
    }
    if (exist(taskName + ".wcs") && exist(taskName + "/" + downloadedFile)) {
        return new Ok({
            readyRelativePath: "ready"
        })
    } else {
        return new Err("Error:Click2install self check failed due to file missing in ready folder")
    }
}
