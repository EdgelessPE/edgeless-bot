import execa from "execa";
import process from "process";
import path from "path";
import UserConfig from "./config";

export default class Spawn {
  public execPath = path.join(__dirname, process.platform);
  public process = <execa.ExecaChildProcess<string>[]>[];
  constructor(protected _config: UserConfig) {}
  all() {
    this.process.push(
      execa(
        path.join(
          this.execPath,
          "aria2c" + (process.platform === "win32" ? ".exe" : "")
        ),
        this._config.resolved.aria2SpawnArgs,
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
