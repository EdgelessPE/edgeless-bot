import {WebSocket as Aria2WebSocket} from 'libaria2-ts';
import cp from 'child_process';
import {config} from './index';

let aria2c_process,aria2;

async function spawnAria2c(binPath:string):Promise<boolean> {
	aria2c_process =await cp.exec(`${binPath} --enable-rpc --rpc-allow-origin-all=true --rpc-listen-all=true --rpc-listen-port=${config.ARIA2_PORT} --rpc-secret=${config.ARIA2_SECRET}`,{
		cwd:process.cwd()
	})
}
