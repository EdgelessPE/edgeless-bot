import { getTimeString, log } from "./utils";
import cp from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { config } from "./config";

function login(): boolean {
  if (!config.GITHUB_ACTIONS) {
    return false;
  }
  const token = process.env.CLOUD139_TOKEN;
  if (!token) {
    log("Error:Can't find CLOUD139_TOKEN environment variable");
    return false;
  }
  try {
    log("Info:Login to cloud139..");
    cp.execSync(`cloud139 login -t ${token}`);
  } catch {
    log("Error:Failed to login to cloud139..");
    return false;
  }
  return true;
}

function uploadToRemote(fileName: string, category: string): boolean {
  if (config.REMOTE_ENABLE) {
    const localPath = `${config.DIR_BUILDS}/${category}/${fileName}`;
    const remotePath = `${config.REMOTE_PATH}/${category}`;
    let date = new Date();
    const startTime = date.getTime();

    try {
      log(`Info:Uploading ${fileName}`);
      deleteFromRemote(fileName, category, true);
      cp.execSync(`cloud139 upload "${localPath}" "${remotePath}"`);
    } catch (err: any) {
      console.log(err?.output?.toString() || err);
      date = new Date();
      log(
        `Info:Cost ${getTimeString(
          date.getTime() - startTime,
        )} before error occurred`,
      );
      log("Info:Trying to delete broken uploaded file");
      if (!deleteFromRemote(fileName, category, true)) {
        log("Warning:Fail to delete broken uploaded file");
      } else {
        log("Info:Deleted broken uploaded file");
      }

      return false;
    }
    date = new Date();
    log(
      `Info:Uploaded successfully, cost ${getTimeString(
        date.getTime() - startTime,
      )}`,
    );
  } else {
    log("Warning:Remote disabled, skip upload to remote");
  }

  return true;
}

function deleteFromRemote(
  fileName: string,
  category: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ignoreNotExist?: boolean,
): boolean {
  if (config.REMOTE_ENABLE) {
    const remotePath = `${config.REMOTE_PATH}/${category}/${fileName}`;
    const tempJsonFile = path.join(
      os.tmpdir(),
      `cloud139_ls_${Date.now()}.json`,
    );

    try {
      cp.execSync(
        `cloud139 ls "${config.REMOTE_PATH}/${category}" -o "${tempJsonFile}"`,
      );
    } catch (err: any) {
      console.log(err?.output?.toString() || err);
      log(
        `Error:Remote directory not exist:${config.REMOTE_NAME}:${config.REMOTE_PATH}/${category}`,
      );
      return false;
    }

    let fileExists = false;
    try {
      const content = fs.readFileSync(tempJsonFile, "utf-8");
      const data: {
        path: string;
        page: number;
        page_size: number;
        total: number;
        items: {
          name: string;
          type: string;
          size: number;
          modified: string;
        }[];
      } = JSON.parse(content);
      fileExists = data.items.some((f) => f.name === fileName);
    } catch {
      fileExists = false;
    } finally {
      if (fs.existsSync(tempJsonFile)) {
        fs.unlinkSync(tempJsonFile);
      }
    }

    if (!fileExists) {
      log(
        `Warning:Remote not exist file : ${config.REMOTE_NAME}:${config.REMOTE_PATH}/${category}/${fileName} ,ignore delete`,
      );
      return true;
    }

    try {
      log(`Info:Removing ${remotePath}`);
      cp.execSync(`cloud139 rm "${remotePath}" --yes`);
    } catch (err: any) {
      console.log(err?.output?.toString() || err);
      return false;
    }

    log("Info:Removed successfully");
  } else {
    log("Warning:Remote disabled, skip delete from remote");
  }

  return true;
}

export { login, uploadToRemote, deleteFromRemote };
