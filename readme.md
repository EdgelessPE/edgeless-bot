# Edgeless 自动插件机器人
## 简介
用于从PortableApps网站自动抓取便携版软件更新信息，当存在更新时自动下载新版并制作成Edgeless插件包然后上传
## 环境
需要Windows 10环境，可以在docker中部署

安装 `rclone`，推荐使用`scoop`进行安装

## 配置
编辑`config.json`
```
{
  // 开启远程
  "enableRemote": false,
  // 忽略远程警告
  "ignoreRemote": false,
  // 任务文件夹
  "dirTask": "./tasks",
  // 工作文件夹
  "dirWorkshop": "./workshop",
  // 构建文件夹
  "dirBuilds": "./builds",
  // 数据库路径
  "pathDatabase": "./database.json",
  // 最大构建数
  "maxBuildsNum": 3,
  // 远程主机名
  "remoteName": "pineapple",
  // 远程根路径
  "remoteRoot": "/hdisk/edgeless/插件包",
  // aria2 RPC 端口
  "aria2Port": 46800,
  // aria2 RPC 主机
  "aria2Host": "localhost",
  // aria2 RPC secret
  "aria2Secret": "cnoisxie",
  // 是否启动 aria2
  "spawnAria2": true,
  // aria2 启动参数
  "aria2SpawnArgs": [
    "--enable-rpc",
    "--rpc-allow-origin-all=true",
    "--rpc-listen-all=true",
    "--rpc-listen-port=46800",
    "--rpc-secret=cnoisxie"
    // 配置代理 "--all-proxy=http://localhost:10089",
  ]
}
```
## 使用
```shell
# 安装依赖
yarn

# 编辑config.jsonc
code config.jsonc

# 运行
yarn run-server
```

## 开发
等待完善