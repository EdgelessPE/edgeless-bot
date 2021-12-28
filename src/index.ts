import configGenerator from './config'
import {CONFIG} from "./class";
import GitHub_Release_Scraper from "./templates/scrapers/GitHub_Release"
import GitHub_Release_Resolver from "./templates/resolvers/GitHub_Release"

export const config: CONFIG = configGenerator().unwrap()

async function main() {

}

async function test() {
    let sRes = (await GitHub_Release_Scraper({
        url: "https://github.com/balena-io/etcher"
    })).unwrap()
    console.log(sRes.version)
    let rRes = (await GitHub_Release_Resolver({
        downloadLink: sRes.downloadLink,
        fileMatchRegex: "balenaEtcher\\-Portable\\-.+\\.exe"
    }))
    console.log(rRes.unwrap())
    //console.log((await robustParseRedirect("https://github.com/EdgelessPE/wimiso/releases/download/v1.1/ventoy_wimboot.img")).unwrap())
}

test().then(_ => {
})
