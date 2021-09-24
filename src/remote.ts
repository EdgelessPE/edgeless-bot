import cp from 'child_process';
import {DIR_BUILDS, ENABLE_REMOTE, IGNORE_REMOTE, REMOTE_NAME, REMOTE_ROOT} from './const';
import {gbk, log, printMS} from './utils';

function uploadToRemote(zname: string, category: string): boolean {
	if (ENABLE_REMOTE) {
		const localPath = DIR_BUILDS + '/' + category + '/' + zname;
		const remotePath = REMOTE_ROOT + '/' + category;
		let date = new Date()
		let startTime = date.getTime()

		try {
			log('Info:Uploading ' + zname);
			cp.execSync(
				'rclone copy "' + localPath + '" ' + REMOTE_NAME + ':' + remotePath,
				{timeout: 1200000},
			);
		} catch (err) {
			console.log(err.output.toString());
			log(`Info:Cost ${printMS(date.getTime() - startTime)} before error occurred`)
			// 尝试删除传了一半的文件
			log('Info:Trying to delete broken uploaded file');
			if (!deleteFromRemote(zname, category, true)) {
				log('Warning:Fail to delete broken uploaded file');
			} else {
				log('Info:Deleted broken uploaded file');
			}

			return false;
		}

		log(`Info:Uploaded successfully,cost ${printMS(date.getTime() - startTime)}`);
	} else if (!IGNORE_REMOTE) {
		log('Warning:Remote disabled,skip upload to remote');
	}

	return true;
}

function deleteFromRemote(zname: string, category: string, ignoreNotExist?: boolean): boolean {
	if (ENABLE_REMOTE) {
		const remotePath = REMOTE_ROOT + '/' + category + '/' + zname;
		//读取远程目录查看是否存在
		let buf
		try {
			buf = cp.execSync(
				'rclone ls ' + REMOTE_NAME + ':' + REMOTE_ROOT + '/' + category,
				{timeout: 10000},
			)
		} catch (err) {
			console.log(err.output.toString());
			log('Error:Remote directory not exist:' + REMOTE_NAME + ':' + REMOTE_ROOT + '/' + category)
			return false;
		}
		//log(`Info:Debug - run deleteFromRemote with remotePath=${remotePath};\n gbk(buf)=${gbk(buf)},\n buf.toString()=${buf.toString()}`)
		if (!gbk(buf).includes(zname) && !buf.toString().includes(zname) && (ignoreNotExist == undefined || !ignoreNotExist)) {
			log('Warning:Remote not exist file:' + zname + ',ignore')
			return true
		}

		//尝试删除
		try {
			log('Info:Removing ' + remotePath);
			cp.execSync(
				'rclone delete \"' + REMOTE_NAME + ':' + remotePath + '\"',
				{timeout: 10000},
			);
		} catch (err) {
			console.log(err.output.toString());
			return false;
		}

		log('Info:Removed successfully');
	} else if (!IGNORE_REMOTE) {
		log('Warning:Remote disabled,skip delete from remote');
	}

	return true;
}

export {
	uploadToRemote,
	deleteFromRemote,
};
