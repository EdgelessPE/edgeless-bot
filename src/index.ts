import configGenerator from './config'
import {CONFIG} from "./class";
import {download, initAria2c, stopAria2c} from "./aria2c";

export const config: CONFIG = configGenerator().unwrap()

async function main() {

}

async function test() {
    await initAria2c()
    await download("Test", "https://pineapple.edgeless.top/api/v2/info/ventoy_addr", "./test", "1.exe")
    await stopAria2c()
}

test().then(_ => {
})
