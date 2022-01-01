import {sleep} from "./utils";
import {isMainThread} from 'worker_threads'

async function main() {

}

async function test() {
    //console.log((await robustParseRedirect("https://github.com/EdgelessPE/wimiso/releases/download/v1.1/ventoy_wimboot.img")).unwrap())

    // let sRes = (await GitHub_Release_Scraper({
    //     url: "https://github.com/balena-io/etcher"
    // })).unwrap()
    // console.log(sRes.version)
    // let rRes = (await GitHub_Release_Resolver({
    //     downloadLink: sRes.downloadLink,
    //     fileMatchRegex: "balenaEtcher\\-Portable\\-.+\\.exe"
    // }))
    // console.log(rRes.unwrap())

    // (await Click2Install({
    //     taskName: "火绒安全",
    //     workshop: "D:\\Desktop\\Projects\\EdgelessPE\\edgeless-bot\\test",
    //     downloadedFile: "sysdiag-full-5.0.65.0-2021.12.28.1.exe",
    //     requiredObject: {
    //         shortcutName: "安装火绒"
    //     }
    // })).unwrap()

    // console.log(schemaValidator({
    //     shortcutName: "安装火绒"
    // }, "producer_templates/Click2Install").unwrap())

    // console.log((await scrapersSpawner(
    //     [
    //         {
    //             name: "火绒安全",
    //             author: "Cno",
    //             category: "安全急救",
    //             pageUrl: "external_scraper://www.huorong.cn/5.0.version.json",
    //             template: {
    //                 producer: "Click2Install"
    //             },
    //             producerRequiredObject: {},
    //             buildManifest: [""]
    //         },
    //         {
    //             name: "balenaEtcher",
    //             author: "Cno",
    //             category: "压缩镜像",
    //             pageUrl: "https://github.com/balena-io/etcher",
    //             template: {
    //                 producer: "Click2Install"
    //             },
    //             producerRequiredObject: {},
    //             buildManifest: [""]
    //         }
    //     ]
    // ))[0].result.val)

}

if (isMainThread) test().then(async _ => {
    await sleep(1000)
    process.exit(0)
})
