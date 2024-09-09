import { WebSocket as Aria2WebSocket } from "libaria2-ts";
import cp from "child_process";
import { getSizeString, getTimeString, log, sleep } from "./utils";
import { getOS, where } from "./platform";
import path from "path";
import fs from "fs";
import { config } from "./config";
import { PROJECT_ROOT } from "./const";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36";

export interface DownloadOptions {
  referer?: string;
}

let aria2c_process: cp.ChildProcess,
  aria2c_alive = false,
  sent_kill = false,
  aria2c_handler: Aria2WebSocket.Client;

// 启动和管理aria2c进程
async function spawnAria2c(binPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const args = [
      "--enable-rpc",
      "--rpc-allow-origin-all=true",
      "--rpc-listen-all=true",
      `--rpc-listen-port=${config.ARIA2_PORT}`,
    ];
    if (config["GLOBAL_PROXY"]) {
      args.push(`--all-proxy=${config.GLOBAL_PROXY}`);
    }
    if (config["ARIA2_SECRET"]) {
      args.push(`--rpc-secret=${config.ARIA2_SECRET}`);
    }
    if (config["ARIA2_THREAD"]) {
      args.push(`--max-connection-per-server=${config.ARIA2_THREAD}`);
      args.push(`--split=${config.ARIA2_THREAD}`);
    }
    // 生成字符串
    let argsString = "";
    for (const a of args) {
      argsString += ` ${a}`;
    }
    aria2c_process = cp.exec(
      binPath + argsString,
      { cwd: PROJECT_ROOT },
      (error, stdout, stderr) => {
        aria2c_alive = false;
        if (sent_kill) {
          log("Info:Aria2c exit");
        } else {
          log(
            `Error:Aria2c exit : ${JSON.stringify(
              error,
              null,
              2,
            )},stdout : ${stdout}, stderr : ${stderr}`,
          );
        }
        resolve(false);
      },
    );
    // 保持1s不退出即视为启动成功
    sleep(config.GITHUB_ACTIONS ? 5000 : 1000).then(() => {
      log(
        `Info:Aria2c spawned, visit https://www.edgeless.top/ariang/#!/settings/rpc/set/http/127.0.0.1/${config.ARIA2_PORT}/jsonrpc to supervise`,
      );
      aria2c_alive = true;
      resolve(true);
    });
  });
}

export async function stopAria2c(): Promise<void> {
  return new Promise((resolve) => {
    if (aria2c_alive) {
      sent_kill = true;
      if (getOS() == "Windows") {
        aria2c_process.kill();
      } else {
        aria2c_process.kill("SIGHUP");
      }
      aria2c_process.on("exit", () => {
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// 由外部调用的初始化函数
export async function initAria2c(): Promise<boolean> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    // 获得二进制配置
    const binRes = where("aria2c");
    if (binRes.err) {
      resolve(false);
      return;
    }
    // 启动进程
    let sRes;
    if (config.ARIA2_SPAWN) {
      sRes = await spawnAria2c(binRes.unwrap());
    } else {
      sRes = true;
    }
    if (sRes) {
      // 尝试连接ws
      for (let i = 0; i < 3; i++) {
        if (await tryConnect(i == 2)) {
          resolve(true);
          break;
        } else if (i == 2) {
          resolve(false);
        } else await sleep(1000);
      }
    } else {
      resolve(false);
    }
  });
}

async function tryConnect(final: boolean): Promise<boolean> {
  try {
    aria2c_handler = new Aria2WebSocket.Client({
      host: "127.0.0.1",
      port: config.ARIA2_PORT,
      auth: {
        secret: config.ARIA2_SECRET,
      },
    });
    const ver = await aria2c_handler.getVersion();
    log(`Info:Aria2c version ${ver.version}`);
    return true;
  } catch (e) {
    if (final) {
      console.log(JSON.stringify(e));
      log(`Error:Can't connect to aria2c via WebSocket`);
    }
    return false;
  }
}

// 下载和等待完成函数
async function download_with_aria2c(
  taskName: string,
  url: string,
  dir: string,
  options: DownloadOptions,
): Promise<string> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    // 处理以 // 开头的链接
    if (url.slice(0, 2) == "//") {
      url = "https:" + url;
    }
    log(`Info:Get download address : ${url}`);
    let filename = "";
    const startTime = Date.now();
    try {
      // Cp.execSync("wget -O target.exe " + url, {cwd: dir});
      log(`Info:Start downloading ${taskName}...`);
      const gid = await aria2c_handler.addUri(
        url,
        {
          dir,
          referer: options.referer,
        },
        0,
      );
      let done = false,
        checked = false,
        status,
        percent;

      while (!done) {
        await sleep(500);
        status = await aria2c_handler.tellStatus(gid);
        if (status.status == "error") {
          reject("Error:Aria2c told task status was error");
          return;
        }

        if (status.status == "complete") {
          done = true;
          filename = path.parse(status.files[0].path).base;
          const ls = fs.readdirSync(dir);
          if (!ls.includes(filename)) {
            log(
              `Warning:Downloaded file not found due to error encoding, patch file name from ${filename} to ${ls[0]}`,
            );
            filename = ls[0];
          }
          log(`Info:${filename} downloaded successfully`);
        }

        if (status.status == "waiting") {
          await sleep(1000);
        }

        // 在下到10%时检查平均速度，对<512KB/s(524,288B/1000ms)的打印警告，其他情况打印预估剩余时间
        percent = Number(status.completedLength) / Number(status.totalLength);
        if (!checked && percent >= 0.1) {
          checked = true;
          const avgSpeed =
              Number(status.completedLength) / (Date.now() - startTime), // 单位B/ms
            etc = Number(status.totalLength) / avgSpeed, // 单位ms
            etcString = getTimeString(etc);
          const d = new Date(startTime + etc),
            endString = d.getHours() + ":" + d.getMinutes();
          if (avgSpeed < 524) {
            log(
              `Warning:${taskName} downloading slowly @ ${getSizeString(
                avgSpeed * 1024,
              )}/s, etc ${etcString} (${endString})`,
            );
          } else {
            log(
              `Info:Task ${taskName} downloading @ ${getSizeString(
                avgSpeed * 1024,
              )}/s, etc ${etcString} (${endString})`,
            );
          }
        }

        // progress.text
        //     = 'Download progress: '
        //     + (Number(status.completedLength as bigint) / 1024 / 1024).toPrecision(
        //         3,
        //     )
        //     + ' / '
        //     + (Number(status.totalLength as bigint) / 1024 / 1024).toPrecision(3)
        //     + ' MB, Speed: '
        //     + (Number(status.downloadSpeed as bigint) / 1024 / 1024).toPrecision(3)
        //     + ' MB/s';
      }
      // progress.succeed(taskName + ' downloaded');
      // progress.stop()
    } catch (err: unknown) {
      console.log(err);
      reject("Error:Download progress thrown");
      return;
    }
    if (fs.existsSync(path.join(dir, filename))) {
      resolve(filename);
    } else {
      reject(`Error:Can't find file ${filename} after download`);
    }
  });
}

async function download_with_curl(
  _taskName: string,
  url: string,
  dir: string,
  options: DownloadOptions,
): Promise<string> {
  // 解析文件名
  const instance = new URL(url);
  const filename = decodeURIComponent(instance.pathname.split("/").pop() ?? "");
  if (!filename) {
    throw new Error(`Error:Failed to resolve url filename : ${url}`);
  }
  const finalPath = path.join(dir, filename);
  if (fs.existsSync(finalPath)) {
    fs.rmSync(finalPath);
  }

  // 构造命令行
  const cmd = ["curl", "-L", `-A "${UA}"`, `-o ${finalPath}`];

  if (options.referer) {
    cmd.push(`-e ${options.referer}`);
  }

  // 开始下载
  try {
    cp.execSync(`${cmd.join(" ")} ${url}`);
  } catch (e) {
    throw new Error(`Error:Failed to download ${url} with curl : ${e}`);
  }
  return filename;
}

export async function download(
  ...args: [string, string, string, DownloadOptions]
): Promise<string> {
  // 先尝试使用 aria2c 下载
  try {
    const res = await download_with_aria2c(...args);
    return res;
  } catch (e) {
    log(`Warning:Failed to download with aria2c, try using curl...`);
    return download_with_curl(...args);
  }
}

export { aria2c_alive };
