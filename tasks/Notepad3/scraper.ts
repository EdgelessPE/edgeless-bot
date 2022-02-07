import axios from "axios";

let version: string, url: string


async function init() {
    let resp = await axios.get("http://api.github.com/repos/rizonesoft/Notepad3/releases/latest",{proxy:false})
    let respData = resp.data
    version = respData.tag_name.replace("RELEASE_","")
    for(let asset of respData['assets']){
        if(asset.name.endsWith("_x64.zip")){
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
