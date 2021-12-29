import fs from "fs";
import cpt from "crypto";
import {log} from "./utils";

async function getMD5(filePath: string): Promise<string> {
    return new Promise(resolve => {
        const rs = fs.createReadStream(filePath);
        const hash = cpt.createHash('md5');
        let hex;
        rs.on('data', hash.update.bind(hash));
        rs.on('end', () => {
            hex = hash.digest('hex');
            log('Info:MD5 is ' + hex);
            resolve(hex);
        });
    });
}

export {
    getMD5
}
