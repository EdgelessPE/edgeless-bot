import axios, {AxiosRequestConfig} from "axios";
import {Err, Ok, Result} from "ts-results";
import {log, sleep} from "./utils";
import {config} from "./config";

function getConfig(axiosConfig?: AxiosRequestConfig): AxiosRequestConfig {
    let result: AxiosRequestConfig = axiosConfig ?? {}
    if (config.GLOBAL_PROXY) {
        let url = config.GLOBAL_PROXY
        let sp1 = url.split(":")
        const protocol = sp1[0], port = Number(sp1[2])
        const host = sp1[1].split("//")[1]

        result["proxy"] = {
            protocol,
            host,
            port
        }
    }
    return result
}

async function robustGet(url: string, axiosConfig?: AxiosRequestConfig): Promise<Result<any, string>> {
    log("Info:" + url)
    const singleFetch = async function (): Promise<Result<any, string>> {
        let res;
        try {
            res = await axios.get(url, getConfig(axiosConfig));
        } catch (err) {
            //console.log(JSON.stringify(err));
            return new Err("Warning:Single fetch failed for " + url + " :\n" + JSON.stringify(err))
        }
        return new Ok(res.data)
    }

    let result = null, r
    for (let i = 0; i < config.MAX_RETRY_SCRAPER; i++) {
        r = await singleFetch()
        if (r.ok) {
            result = r.unwrap()
            break
        } else {
            log(r.val)
            if (i != config.MAX_RETRY_SCRAPER - 1) await sleep(3000)
        }
    }

    if (result == null) {
        return new Err(`Error:Robust get failed : ${url}`)
    } else {
        return new Ok(result)
    }
}

async function robustParseRedirect(url: string): Promise<Result<string, string>> {
    async function fetchURL(): Promise<Result<string, string>> {
        return new Promise((resolve) => {
            axios.get(url, getConfig({maxRedirects: 0}))
                .catch((e) => {
                    if (e.response && (e.response.status == 302 || e.response.status == 301)) {
                        resolve(new Ok(e.response.headers.location))
                    } else {
                        //console.log(e.response?.status)
                        resolve(new Err("Warning:Single fetch failed for " + url + " :\n" + JSON.stringify(e)))
                    }
                })
        })
    }

    let result = null, r
    for (let i = 0; i < config.MAX_RETRY_SCRAPER; i++) {
        r = await fetchURL()
        if (r.ok) {
            result = r.unwrap()
            break
        } else {
            log(r.val)
            if (i != config.MAX_RETRY_SCRAPER - 1) await sleep(3000)
        }
    }

    if (result == null) {
        return new Err(`Error:Robust get failed : ${url}`)
    } else {
        return new Ok(result)
    }
}

export {
    robustGet,
    robustParseRedirect
}
