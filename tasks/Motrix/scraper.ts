import axios from "axios";

let version: string, url: string


async function init() {
    let resp = await axios.get("http://api.github.com/repos/agalwood/Motrix/releases/latest",{proxy:false})
    let respData = resp.data
    version = respData.tag_name.replace("v","")
    for(let asset of respData['assets']){
        if(asset.name ===`Motrix-${version}.exe`){
            url = asset.browser_download_url
            break;
        }
    }
}

function getVersion(): string {
    return version
}

function getDownloadLink(): string {
    return url
}



export {
    init, getVersion, getDownloadLink
}
