import { PATH_DATABASE } from './const'
import fs from "fs"
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
export {
    readDatabase,
    saveDatabase
}