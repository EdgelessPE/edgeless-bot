import configGenerator from './config'
import {CONFIG} from "./class";
import {robustParseRedirect} from "./utils";

export const config: CONFIG = configGenerator().unwrap()

async function main() {

}

async function test() {
    // let sRes= (await GitHub_Release_Scraper({
    //     url: "https://github.com/balena-io/etcher"
    // })).unwrap()
    // console.log(sRes.version)
    // let rRes=(await GitHub_Release_Resolver({
    //     downloadLink:sRes.downloadLink,
    //     fileMatchRegex:"/balenaEtcher-Portable-.+\\.exe/"
    // }))
    // console.log(rRes)
    console.log((await robustParseRedirect("https://github.com/EdgelessPE/wimiso/releases/download/v1.1/ventoy_wimboot.img")).unwrap())
}

test().then(_ => {
})
