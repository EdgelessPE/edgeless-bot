import configGenerator from './config'
import {CONFIG, JsObjectType, ObjectValidationNode, ValidationType} from "./class";
import {objectValidator} from "./utils";

export const config: CONFIG = configGenerator().unwrap()

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

    const checkList: Array<ObjectValidationNode> = [
        {
            key: "version",
            type: JsObjectType.string,
            required: true
        },
        {
            key: "downloadLink",
            type: JsObjectType.string,
            required: true
        },
        {
            key: "validation",
            type: JsObjectType.object,
            required: false,
            properties: [
                {
                    key: "type",
                    type: JsObjectType.numberOrEnum,
                    required: true
                },
                {
                    key: "value",
                    type: JsObjectType.string,
                    required: true
                }
            ]
        }
    ]
    const obj = {
        version: 111,
        downloadLink: "https://222",
        validation: {
            type: ValidationType.MD5,
            value: 1111
        }
    }
    console.log(objectValidator(obj, checkList))
}

test().then(_ => {
})
