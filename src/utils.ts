import chalk from 'chalk';
import fs from 'fs';
import path from "path";
import cpt from 'crypto'
import {Err, Ok, Result} from 'ts-results';
import Ajv from 'ajv'
import axios, {AxiosRequestConfig} from "axios";
import {config} from "./index";

enum Cmp {
    L, E, G
}

function print(text: string, ga_mode: boolean) {
    // 增加字符串类型判断
    if (typeof text !== 'string') {
        console.log(chalk.yellow('Warning ') + 'Illegal type detected');
        console.log(JSON.stringify(text));
        return;
    }

    const spl = text.split(':');
    if (spl.length < 2) {
        console.log(chalk.yellow('Warning ') + 'Illegal message detected');
        console.log(text);
        return;
    }

    const inf = text.substring(spl[0].length + 1);
    switch (spl[0]) {
        case 'Info':
            if (ga_mode) {
                console.log(chalk.blue('Info: ') + inf);
            } else {
                console.log(chalk.blue('Info ') + inf);
            }

            break;
        case 'Success':
            if (ga_mode) {
                console.log(chalk.greenBright('Success: ') + inf);
            } else {
                console.log(chalk.greenBright('Success ') + inf);
            }

            break;
        case 'Warning':
            if (ga_mode) {
                console.log('::warning::' + inf);
            } else {
                console.log(chalk.yellow('Warning ') + inf);
            }

            break;
        case 'Error':
            if (ga_mode) {
                console.log('::error::' + inf);
            } else {
                console.log(chalk.red('Error ') + inf);
            }

            break;
        default:
            if (ga_mode) {
                console.log('::warning::Illegal message detected:' + inf);
            } else {
                console.log(chalk.yellow('Warning ') + 'Illegal message detected');
                console.log(text);
            }
    }
}

function log(text: string) {
    print(text, false)
}

async function getMD5(filePath: string): Promise<string> {
    return new Promise(resolve => {
        const rs = fs.createReadStream(filePath);
        const hash = cpt.createHash('md5');
        let hex;
        rs.on('data', hash.update.bind(hash));
        rs.on('end', () => {
            hex = hash.digest('hex');
            log('Info:MD5 is ' + hex);
            resolve(hex);
        });
    });
}

function formatVersion(version: string): Result<string, string> {
    const spl = version.split('.');

    //削减长的版本号
    if (spl.length > 4) {
        log(`Warning:Slice long version: ${version}`);
        return new Ok(`${spl[0]}.${spl[1]}.${spl[2]}.${spl[3]}`)
    }

    // 将版本号扩充为4位
    for (let i = 0; i < 4 - spl.length; i++) {
        version += '.0';
    }

    return new Ok(version);
}

function matchVersion(text: string): Result<string, string> {
    const regex = /\d+.\d+(.\d+)*/;
    const matchRes = text.match(regex);
    if (!matchRes || matchRes.length === 0) {
        return new Err(`Error:Matched no version with ${text}"`);
    }

    return new Ok(matchRes[0]);
}

function isURL(str_url: string): boolean {
    return str_url.slice(0, 4) == "http"
}

function getSizeString(size: number): string {
    if (size < 1024) return size.toFixed(2) + "B"
    else if (size < 1024 * 1024) return (size / 1024).toFixed(2) + "KB"
    else if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + "MB"
    else return (size / (1024 * 1024 * 1024)).toFixed(2) + "GB"
}

function getTimeString(ms: number): string {
    const s = ms / 1000
    if (s < 60) {
        return `${s.toFixed(1)} s`
    } else {
        return `${(s / 60).toFixed(1)} min`
    }
}

function versionCmp(a: string, b: string): Cmp {
    const x = a.split('.');
    const y = b.split('.');
    let result: Cmp = Cmp.E;

    for (let i = 0; i < Math.min(x.length, y.length); i++) {
        if (Number(x[i]) < Number(y[i])) {
            result = Cmp.L;
            break;
        } else if (Number(x[i]) > Number(y[i])) {
            result = Cmp.G;
            break;
        }
    }

    // 处理前几位版本号相同但是位数不一致的情况，如1.3/1.3.0
    if (result === Cmp.E && x.length !== y.length) {
        // 找出较长的那一个
        let t: Array<string>;
        t = x.length < y.length ? y : x;
        // 读取剩余位
        for (
            let i = Math.min(x.length, y.length);
            i < Math.max(x.length, y.length);
            i++
        ) {
            if (Number(t[i]) !== 0) {
                result = x.length < y.length ? Cmp.L : Cmp.G;
                break;
            }
        }
    }

    return result;
}

async function awaitWithTimeout(closure: () => any, timeout: number): Promise<any> {
    return new Promise((async (resolve, reject) => {
        setTimeout(() => {
            reject("Error:Await failed due to timeout")
        }, timeout)
        let res = await closure()
        resolve(res)
    }))
}

async function sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
}

async function robustGet(url: string, axiosConfig?: AxiosRequestConfig<any>): Promise<Result<any, string>> {
    const singleFetch = async function (): Promise<Result<any, string>> {
        let res;
        try {
            res = await axios.get(url, axiosConfig ?? {});
        } catch (err) {
            console.log(JSON.stringify(err));
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
                        console.log(e.response.status)
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
        }
    }

    if (result == null) {
        return new Err(`Error:Robust get failed : ${url}`)
    } else {
        return new Ok(result)
    }
}

function schemaValidator(obj: any, schema: string): Result<boolean, string> {
    //读取schema文件
    const schemaFilePath = path.join("./schema", schema + ".json")
    if (!fs.existsSync(schemaFilePath)) {
        return new Err(`Error:Specified schema not found : ${schemaFilePath}`)
    }
    let schemaJson = JSON.parse(fs.readFileSync(schemaFilePath).toString())


    const ajv=new Ajv()
    const validate=ajv.compile(schemaJson)
    if(validate(obj)){
        return new Ok(true)
    }else {
        console.log(JSON.stringify(validate.errors))
        return new Ok(false)
    }
}

export {
    log,
    getMD5,
    formatVersion,
    matchVersion,
    isURL,
    getSizeString,
    getTimeString,
    versionCmp,
    awaitWithTimeout,
    sleep,
    schemaValidator,
    robustGet,
    robustParseRedirect
}
