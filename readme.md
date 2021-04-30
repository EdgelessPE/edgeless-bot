# Edgeless 自动插件机器人
## 简介
用于从PortableApps网站自动抓取便携版软件更新信息，当存在更新时自动下载新版并制作成Edgeless插件包然后上传
## 环境
需要Windows 10环境，可以在docker中部署

安装 `wget` `rclone`，推荐使用`scoop`进行安装

## 配置
编辑`config.json`
```
{
  "DIR_TASKS":"./tasks", //任务根目录，默认不需要更改
  "DIR_WORKSHOP":"./workshop", //工作临时目录，默认不需要更改
  "DIR_BUILDS":"./builds", //构建的插件包存放目录，默认不需要更改

  "PATH_DATABASE":"./database.json", //数据库文件位置，默认不需要更改
  "MAX_BUILDS":3, //最大保留的构建插件包数量，超过此上限的插件包会被删除（包括本地的和远程的）
  "DISABLE_UPLOAD":false, //是否禁用编译完成后上传功能，当此项值为true时可以不用填写下面两项
  "REMOTE_NAME":"pineapple", //rclone中配置的远程存储名称
  "REMOTE_ROOT":"/hdisk/edgeless/插件包" //远程存储的插件包存放根目录
}
```
## 使用
```
//安装依赖
yarn
//编辑config.json
code config.json
//运行index.ts
node --require ts-node/register index.ts
```

## 开发
等待完善