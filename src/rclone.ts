import {fromGBK, getTimeString, log} from './utils';
import cp from 'child_process';
import {config} from './config';

//FIXME:rclone自身原因，无法读取配置的http_proxy环境变量以使用代理
function getOptions(timeout: number): cp.ExecSyncOptionsWithBufferEncoding {
	let result: cp.ExecSyncOptionsWithBufferEncoding = {
		timeout,
	};
	if (config.GLOBAL_PROXY) {
		result['env'] = {
			http_proxy: config.GLOBAL_PROXY,
		};
	}
	//console.log(result)
	return result;
}

function uploadToRemote(fileName: string, category: string): boolean {
	if (config.REMOTE_ENABLE) {
		const localPath = config.DIR_BUILDS + '/' + category + '/' + fileName;
		const remotePath = config.REMOTE_PATH + '/' + category;
		let date = new Date();
		let startTime = date.getTime();

		try {
			log('Info:Uploading ' + fileName);
			cp.execSync(
				'rclone copy "' + localPath + '" ' + config.REMOTE_NAME + ':' + remotePath,
				getOptions(3600000),
			);
		} catch (err: any) {
			console.log(err?.output.toString());
			date = new Date();
			log(`Info:Cost ${getTimeString(date.getTime() - startTime)} before error occurred`);
			// 尝试删除传了一半的文件
			log('Info:Trying to delete broken uploaded file');
			if (!deleteFromRemote(fileName, category, true)) {
				log('Warning:Fail to delete broken uploaded file');
			} else {
				log('Info:Deleted broken uploaded file');
			}

			return false;
		}
		date = new Date();
		log(`Info:Uploaded successfully, cost ${getTimeString(date.getTime() - startTime)}`);
	} else {
		log('Warning:Remote disabled, skip upload to remote');
	}

	return true;
}

function deleteFromRemote(fileName: string, category: string, ignoreNotExist?: boolean): boolean {
	if (config.REMOTE_ENABLE) {
		const remotePath = config.REMOTE_PATH + '/' + category + '/' + fileName;
		//读取远程目录查看是否存在
		let buf;
		try {
			buf = cp.execSync(
				'rclone ls ' + config.REMOTE_NAME + ':' + config.REMOTE_PATH + '/' + category,
				getOptions(10000),
			);
		} catch (err: any) {
			console.log(err?.output.toString());
			log('Error:Remote directory not exist:' + config.REMOTE_NAME + ':' + config.REMOTE_PATH + '/' + category);
			return false;
		}
		//log(`Info:Debug - run deleteFromRemote with remotePath=${remotePath};\n gbk(buf)=${gbk(buf)},\n buf.toString()=${buf.toString()}`)
		if (!fromGBK(buf).includes(fileName) && !buf.toString().includes(fileName) && (ignoreNotExist == undefined || !ignoreNotExist)) {
			log('Warning:Remote not exist file : ' + config.REMOTE_NAME + ':' + config.REMOTE_PATH + '/' + category + '/' + fileName + ' ,ignore');
			return true;
		}

		//尝试删除
		try {
			log('Info:Removing ' + remotePath);
			cp.execSync(
				'rclone delete \"' + config.REMOTE_NAME + ':' + remotePath + '\"',
				getOptions(10000),
			);
		} catch (err: any) {
			console.log(err?.output.toString());
			return false;
		}

		log('Info:Removed successfully');
	} else {
		log('Warning:Remote disabled, skip delete from remote');
	}

	return true;
}

export {
	uploadToRemote,
	deleteFromRemote,
};
