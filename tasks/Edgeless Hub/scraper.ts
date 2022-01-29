import axios from "axios";

const FETCH_URL = "https://pineapple.edgeless.top/api/v2/info/hub"

interface ReleaseEntry {
    version: string;
    url: string;
}

let entry: ReleaseEntry;
export async function init() {
    const resp = await axios.get<any>(FETCH_URL)

    if (resp.status != 200) {
        throw new Error('fetch releases error!')
    }

    entry = {
        version: resp.data.version,
        url: resp.data.address
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

