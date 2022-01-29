import axios from "axios";

const FETCH_URL = "https://api.github.com/repos/denoland/deno/releases/latest"
const ASSET_PATTERN = /^deno-x86_64-pc-windows-msvc.*\.zip$/

interface ReleaseEntry {
    version: string;
    url: string;
}

let entry: ReleaseEntry;
export async function init() {
    const resp = await axios.get<any>(FETCH_URL, {
        
    })

    if (resp.status != 200) {
        throw new Error('fetch releases error!')
    }

    let version = (resp.data.tag_name as string)
    version = version.trim().slice(
        version.indexOf('v')
    )

    let asset_item: any | null = null;

    for (const item of resp.data.assets) {
        if (ASSET_PATTERN.test(item.name)) {
            asset_item = item
            break;
        }
    }

    if (asset_item == null) {
        throw new Error("find asset error!")
    }

    const url = asset_item.browser_download_url.trim()
    
    entry = {
        version,
        url
    }
    console.log(entry)
    
    return;
}  

export function getVersion(): string {
    return entry.version
}

export function getDownloadLink(): string {
    return entry.url
}

