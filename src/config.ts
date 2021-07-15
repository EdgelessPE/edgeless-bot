import stripJson from 'strip-json-comments';

export interface OriginalUserConfig {
  // 开启远程
  enableRemote: boolean;
  // 忽略远程警告
  ignoreRemote: boolean;
  // 任务文件夹
  dirTask: string;
  // 工作文件夹
  dirWorkshop: string;
  // 构建文件夹
  dirBuilds: string;
  // 数据库路径
  pathDatabase: string;
  // 最大构建数
  maxBuildsNum: number;
  // 远程主机名
  remoteName: string;
  // 远程根路径
  remoteRoot: string;
  // Aria2 RPC 端口
  aria2Port: number;
  // Aria2 RPC 主机
  aria2Host: string;
  // Aria2 RPC secret
  aria2Secret: string;
  // 是否启动 aria2
  spawnAria2: boolean;
  // Aria2 启动参数
  aria2SpawnArgs: string[];
}

export default class UserConfig {
  public resolved: OriginalUserConfig;
  constructor(private _source: string) {
  	this.resolved = JSON.parse(stripJson(this._source));
  }
}
