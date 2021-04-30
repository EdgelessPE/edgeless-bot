import execa from "execa";
import process from "process";
import path from "path";

export default class Spawn {
  public execPath = path.join(__dirname, process.platform);
  public process = <execa.ExecaChildProcess<string>[]>[];
  constructor() {}
  all() {
    this.process.push(
      execa(
        path.join(
          this.execPath,
          "aria2c" + (process.platform === "win32" ? ".exe" : "")
        ),
        [
          "-x128",
          "-j128",
          "--enable-rpc",
          "--rpc-allow-origin-all=true",
          "--rpc-listen-all=true",
          "--rpc-listen-port=7680",
          "--rpc-secret=cnoisxie",
          // 配置代理 "--all-proxy=http://localhost:10089",
        ],
        {
          cwd: process.cwd(),
        }
      )
    );
  }
  promise() {
    return Promise.all(this.process);
  }
}
