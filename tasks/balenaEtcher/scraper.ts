import axios from "axios";

const FETCH_URL = "https://api.github.com/repos/balena-io/etcher/releases"
const ASSET_PATTERN = /^balenaEtcher\-Portable\-.*\.exe$/

interface ReleaseEntry {
    version: string;
    url: string;
}

let entry: ReleaseEntry = {
    version: 'v1.7.1',
    url: 'https://github.com/balena-io/etcher/releases/download/v1.7.1/balenaEtcher-Portable-1.7.1.exe'
  };

export async function init() {
    // const resp = await axios.get<any[]>(FETCH_URL)
    // const latest = resp?.data?.[0]
    // if (latest == null) {
    //     throw new Error("fetch releases error!")
    // }

    // let version = latest.name as string
    // version = version.trim().slice(
    //     version.indexOf('v')
    // )

    // let asset_item: any

    // for (const item of latest.assets) {
    //     if (ASSET_PATTERN.test(item.name)) {
    //         asset_item = item
    //         break;
    //     }
    // }

    // if (asset_item == null) {
    //     throw new Error("find asset error!")
    // }

    // const url = asset_item.browser_download_url.trim()

    // entry = {
    //     version,
    //     url
    // }
    // console.log(entry)
    return;
}  

export function getVersion(): string {
    return entry.version
}

export function getDownloadLink(): string {
    return entry.url
}

