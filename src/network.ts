import axios, {AxiosRequestConfig} from "axios";
import {Err, Ok, Result} from "ts-results";
import {config} from "./index";
import {log, sleep} from "./utils";


async function robustGet(url: string, axiosConfig?: AxiosRequestConfig<any>): Promise<Result<any, string>> {
    const singleFetch = async function (): Promise<Result<any, string>> {
        let res;
        try {
            res = await axios.get(url, axiosConfig ?? {});
        } catch (err) {
            //console.log(JSON.stringify(err));
            return new Err("Warning:Single fetch failed")
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
            axios.get(url, {maxRedirects: 0,})
                .catch((e) => {
                    if (e.response && (e.response.status == 302 || e.response.status == 301)) {
                        resolve(new Ok(e.response.headers.location))
                    } else {
                        //console.log(e.response?.status)
                        resolve(new Err("Warning:Single fetch failed"))
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
