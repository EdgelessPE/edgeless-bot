import {WebSocket as Aria2WebSocket} from 'libaria2-ts';
import cp from 'child_process';
import {config} from './index';
import {log, sleep} from "./utils";
import {getOS, OS, where} from "./platform";
import chalk from "chalk";
import ora from "ora";


let aria2c_process: cp.ChildProcessWithoutNullStreams, aria2c_alive = false, sent_kill = false,
    aria2c_handler: Aria2WebSocket.Client;

//启动和管理aria2c进程
async function spawnAria2c(binPath: string): Promise<boolean> {
    return new Promise((async resolve => {
        let args = [
            "--enable-rpc",
            "--rpc-allow-origin-all=true",
            "--rpc-listen-all=true",
            `--rpc-listen-port=${config.ARIA2_PORT}`,
        ]
        if (config["ARIA2_PROXY"]) {
            args.push(`--all-proxy=${config.ARIA2_PROXY}`)
        }
        if (config["ARIA2_SECRET"]) {
            args.push(`--rpc-secret=${config.ARIA2_SECRET}`)
        }
        if (config["ARIA2_THREAD"]) {
            args.push(`--max-connection-per-server=${config.ARIA2_THREAD}`)
            args.push(`--split=${config.ARIA2_THREAD}`)
        }
        aria2c_process = cp.spawn(binPath, args)
        aria2c_process.on('exit', _ => {
            aria2c_alive = false
            if (sent_kill) {
                log("Info:Aria2c exit")
            } else {
                log("Error:Aria2c exit")
            }
            resolve(false)
        })
        const waitSpawned = async function (p: cp.ChildProcessWithoutNullStreams): Promise<void> {
            return new Promise((resolve1 => {
                p.stdout.on('data', (_: any) => {
                    resolve1()
                })
            }))
        }
        await waitSpawned(aria2c_process)
        log("Info:Aria2c spawned")
        aria2c_alive = true
        resolve(true)
    }))
}

async function stopAria2c(): Promise<void> {
    return new Promise((resolve => {
        if (aria2c_alive) {
            sent_kill = true
            if (getOS() == OS.Windows) aria2c_process.kill()
            else aria2c_process.kill('SIGHUP')
            aria2c_process.on('exit', _ => {
                resolve()
            })
        } else resolve()
    }))
}

//由外部调用的初始化函数
async function initAria2c(): Promise<boolean> {
    return new Promise((async resolve => {
        //获得二进制配置
        let binRes = where("aria2c")
        if (binRes.err) {
            resolve(false)
        }
        //启动进程
        let sRes
        if (config.ARIA2_SPAWN) {
            sRes = await spawnAria2c(binRes.unwrap())
        } else sRes = true
        if (sRes) {
            //连接ws
            aria2c_handler = new Aria2WebSocket.Client({
                host: 'localhost',
                port: config.ARIA2_PORT,
                auth: {
                    secret: config.ARIA2_SECRET
                }
            })
            try {
                let ver = await aria2c_handler.getVersion()
                log(`Info:Aria2c version ${ver.version}`)
            } catch (e) {
                console.log(JSON.stringify(e))
                resolve(false)
            }
            resolve(true)
        } else {
            resolve(false)
        }
    }))
}

//下载和等待完成函数
async function download(taskName: string, url: string, dir: string, fileName: string): Promise<boolean> {
    return new Promise((async resolve => {
        try {
            // Cp.execSync("wget -O target.exe " + url, {cwd: dir});
            log('Info:Start downloading ' + taskName);
            const gid = await aria2c_handler.addUri(
                url,
                {
                    dir,
                    out: fileName,
                },
                0,
            );
            let done = false;
            const progress = ora({
                text: 'Downloading ' + taskName + '...',
                prefixText: chalk.blue('Info'),
            });
            progress.start();
            while (!done) {
                await sleep(500);
                const status = await aria2c_handler.tellStatus(gid);
                if (status.status == 'error') {
                    throw status;
                }

                if (status.status == 'complete') {
                    done = true;
                }

                if (status.status == 'waiting') {
                    await sleep(1000);
                }

                progress.text
                    = 'Download progress: '
                    + (Number(status.completedLength as bigint) / 1024 / 1024).toPrecision(
                        3,
                    )
                    + ' / '
                    + (Number(status.totalLength as bigint) / 1024 / 1024).toPrecision(3)
                    + ' MB, Speed: '
                    + (Number(status.downloadSpeed as bigint) / 1024 / 1024).toPrecision(3)
                    + ' MB/s';
            }
            progress.succeed(taskName + ' downloaded');
            progress.stop()
            resolve(true)
        } catch (err: any) {
            console.log(err);
            resolve(false)
        }
        resolve(true)
    }))
}

export {
    initAria2c,
    download,
    aria2c_alive,
    stopAria2c
}
