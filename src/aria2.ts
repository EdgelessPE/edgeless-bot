import {WebSocket as Aria2WebSocket} from 'libaria2-ts';
import cp from 'child_process';
import {config} from './index';
import {log} from "./utils";
import {where} from "./platform";

let aria2c_process,aria2c_alive=false,aria2c_handler;

//启动和管理aria2c进程
async function spawnAria2c(binPath:string):Promise<boolean> {
	return new Promise((async resolve => {
		let args = [
			"--enable-rpc",
			"--rpc-allow-origin-all=true",
			"--rpc-listen-all=true",
			`--rpc-listen-port=${config.ARIA2_PORT}`,
			`--rpc-secret=${config.ARIA2_SECRET}`
		]
		if (config["ARIA2_PROXY"]) {
			args.push(`--all-proxy=${config.ARIA2_PROXY}`)
		}
		aria2c_process = cp.spawn(binPath, args)
		aria2c_process.on('exit', _ => {
			aria2c_alive = false
			log("Info:Aria2c exit")
			resolve(false)
		})
		const waitSpawned = async function (p: cp.ChildProcessWithoutNullStreams):Promise<void> {
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

//由外部调用的初始化函数
async function initAria2c():Promise<boolean>{
	return new Promise((async resolve => {
		//获得二进制配置
		let binRes=where("aria2c")
		if(binRes.err){
			resolve(false)
		}
		//启动进程
		let sRes
		if(config.ARIA2_SPAWN){
			sRes=await spawnAria2c(binRes.unwrap())
		}else sRes=true
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

export {
	initAria2c
}
