import {config} from "./index";
import fs from "fs";

const shell = require("shelljs")
const DIR_WORKSHOP=config.DIR_WORKSHOP

function clearWorkshop():boolean{
    shell.rm('-rf', DIR_WORKSHOP)
    if(fs.existsSync(DIR_WORKSHOP)) return false
    shell.mkdir(DIR_WORKSHOP)
    return fs.existsSync(DIR_WORKSHOP)
}

export {
    clearWorkshop
}
