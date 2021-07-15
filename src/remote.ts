import cp from 'child_process';
import {ENABLE_REMOTE, IGNORE_REMOTE, REMOTE_NAME, REMOTE_ROOT, DIR_BUILDS} from './const';
import {log} from './utils';

function uploadToRemote(zname: string, category: string): boolean {
	if (ENABLE_REMOTE) {
		const localPath = DIR_BUILDS + '/' + category + '/' + zname;
		const remotePath = REMOTE_ROOT + '/' + category;

		try {
			log('Info:Uploading ' + zname);
			cp.execSync(
				'rclone copy "' + localPath + '" ' + REMOTE_NAME + ':' + remotePath,
				{timeout: 1200000},
			);
		} catch (err) {
			console.log(err.output.toString());
			// 尝试删除传了一半的文件
			if (!deleteFromRemote(zname, category)) {
				log('Warning:Fali to delete broken uploaded file');
			}

			return false;
		}

		log('Info:Uploaded successfully');
	} else if (!IGNORE_REMOTE) {
		log('Warning:Remote disabled,skip upload to remote');
	}

	return true;
}

function deleteFromRemote(zname: string, category: string): boolean {
	if (ENABLE_REMOTE) {
		const remotePath = REMOTE_ROOT + '/' + category + '/' + zname;

		try {
			log('Info:Removing ' + remotePath);
			cp.execSync(
				'rclone delete ' + REMOTE_NAME + ':' + remotePath,
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
