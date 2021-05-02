# Edgeless 自动插件机器人
## 简介
用于从PortableApps网站自动抓取便携版软件更新信息，当存在更新时自动下载新版并制作成Edgeless插件包然后上传
## 环境
需要Windows 10环境，可以在docker中部署

安装 `rclone`，推荐使用 [scoop](https://scoop.sh) 进行安装

## 配置
编辑`config.jsonc`
```
{
  // 开启远程，使用rclone将构建成功的插件包上传至服务器
  "enableRemote": false,
  // 忽略远程警告，默认状态下禁用远程时程序会输出一条Warning
  "ignoreRemote": false,
  // 任务文件夹，存放所有的任务描述
  "dirTask": "./tasks",
  // 工作文件夹，其子目录会作为make脚本工作目录使用
  "dirWorkshop": "./workshop",
  // 构建文件夹，存放构建成功的插件包
  "dirBuilds": "./builds",
  // 数据库路径，用于保存构建信息
  "pathDatabase": "./database.json",
  // 最大构建数，成功的构建总数超过此值时程序会尝试从本地和远程删除过期构建
  "maxBuildsNum": 3,
  // 远程主机名，需要在rclone中提前配置远程存储
  "remoteName": "pineapple",
  // 远程根路径，远程存储中存放构建的根目录
  "remoteRoot": "/hdisk/edgeless/插件包",
  // aria2 RPC 端口，如果出现端口冲突导致的aria2启动失败请修改此值
  "aria2Port": 46800,
  // aria2 RPC 主机，理论上不允许修改
  "aria2Host": "localhost",
  // aria2 RPC 秘钥，必须与启动参数中"--rpc-secret"的值一致
  "aria2Secret": "edgeless",
  // 是否启动 aria2，如果已经有正在运行的aria2可以禁用此项阻止自带aria2运行
  "spawnAria2": true,
  // aria2 启动参数
  "aria2SpawnArgs": [
    // 配置代理 "--all-proxy=http://localhost:10089",
    "--enable-rpc",
    "--rpc-allow-origin-all=true",
    "--rpc-listen-all=true",
    "--rpc-listen-port=46800",
    "--rpc-secret=edgeless"
  ]
}
```
## 使用
```
:: 安装依赖
yarn

:: 运行
yarn serve
```

## 开发
等待完善