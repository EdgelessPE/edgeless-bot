# Edgeless 自动插件机器人
## 简介
用于从PortableApps网站自动抓取便携版软件更新信息，当存在更新时自动下载新版并制作成Edgeless插件包然后上传

## 特性
* 支持自动识别和校对MD5、自动检测简体中文版本、自动解析下载地址，甚至支持无需编写make.cmd脚本的全自动制作

* 支持最近三次的构建状态记录和自动删除冗余历史构建

* 得益于使用rclone，远程上传功能支持本地存储、FTP、Onedrive、Google Drive等五十多种存储方式，详情请查看[Rclone官方介绍](https://rclone.org/#providers)

## 环境
需要Windows 10环境

如果需要启用远程上传功能请安装 [rclone](https://rclone.org/) ，推荐使用 [scoop](https://scoop.sh) 命令`scoop install rclone`进行安装

## 配置
编辑`config.jsonc`
```
{
  // 开启远程，使用rclone将构建成功的插件包上传至服务器
  "enableRemote": false,
  // 忽略远程警告，禁用远程时程序会输出Warning，启用此项可以忽略此Warning
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
  // 远程主机名，需要在rclone中提前配置远程存储然后将远程存储名称填入此处
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
### 创建任务
为了创建一个任务，你需要提供一个名为`config.json`的文件，结构如下：
```typescript
class Task {
    name: string; //软件名（也作为任务名）
    category: string; //软件分类
    author: string; //打包者名称

    paUrl: string; //PortableApps网页链接
    releaseRequirement: Array<string>; //解压下载的exe后工作目录中应该出现的文件/文件夹，用于包校验
    buildRequirement:Array<string>; //构建成功时工作目录中应该出现的文件/文件夹，用于构建校验
    preprocess:boolean; //是否启用PortableApps预处理
    autoMake:boolean; //是否启用自动制作
}
```
示例（Firefox）：
```json
{
    "name":"Firefox",
    "category":"浏览器",
    "author":"Cno",

    "paUrl":"https://portableapps.com/apps/internet/firefox_portable",
    "releaseRequirement":["FirefoxPortable.exe","App/Firefox64/firefox.exe"],
    "buildRequirement": ["Firefox_bot.wcs","Firefox_bot/FirefoxPortable.exe"],
    "preprocess": true,
    "autoMake": true
}
```
释义：
#### name
软件名称，会体现在构建生成文件的文件名中
#### category
软件分类，必须是Edgeless下载站现有分类中的一种，如果觉得需要新建分类请建立issue
#### author
打包者名暨Task配置作者名，会体现在构建生成文件的文件名中；最终的构建文件名会在打包者后加上（bot）表示此插件包由Edgeless bot构建，未经过人工测试
#### paUrl
PortableApps URL，页面中必须包含一个绿色的下载按钮（className="download-box"）
#### releaseRequirement
将从PortableApps下载得到的.paf.exe文件直接使用7-Zip解压后得到的文件夹中需要包含的文件/文件夹，用于校验下载到的软件是否正确和适用此Task
#### buildRequirement
运行`make.cmd`脚本或自动构建后`build`文件夹应该出现的文件/文件夹，用于校验`make.cmd`脚本或自动构建是否执行成功
#### preprocess
预处理`release`目录，程序会执行两个步骤：
1. 删除`$PLUGINSDIR`目录
2. 修改`pac_installer_log.ini`以绕过首次运行会弹出的安全警告
#### autoMake
使用自动制作，如果启用此项则不需要编写`make.cmd`脚本，程序会生成一个在Edgeless桌面指向`release`目录的第一个可执行文件的快捷方式，快捷方式名称为项目名

### 编写脚本（*如果没有启用自动制作）
大部分的程序都可以直接使用`autoMake`选项自动制作（记得同时启用`preprocess`执行预处理），部分应用需要作者编写`make.cmd`以完成构建，例如在线版本的Chrome
#### 流程
和Edgeless插件包类似，`make.cmd`会在一个特定的目录中执行，称之为"Workshop"。Workshop的起始目录结构如下：
```
│  target.exe
├─build
└─release
    └─*
```
其中：

`target.exe`是PortableApps网站上下载得到的.paf.exe文件

`build`是一个空白目录，你编写的`make.cmd`脚本需要将插件包 **压缩前** 的内容提供在这个目录中

`release`目录则是`target.exe`解压后得到的文件，例如：

```
└─release
    │  GoogleChromePortable.exe
    │  help.html
    ├─$PLUGINSDIR
    ├─7zTemp
    ├─App
    │  ├─AppInfo
    │  ├─Chrome-bin
    │  └─DefaultData
    │      └─profile
    │          └─Default
    └─Other
        ├─Help
        │  └─images
        └─Source
            ├─ChromePasswords
            │  ├─ChromePasswords
            │  └─Release
            └─Languages
```
在执行`make.cmd`时，你可能需要一些外部工具。我们允许你建立一个`utils`文件夹存放你需要的工具，因此在`make.cmd`运行时的Workshop就会是这样：
> 如果你不需要外部工具，不要建立这个文件夹就行了
```
│  target.exe
│  make.cmd
├─utils
│   └─*
├─build
└─release
    └─*
```
#### 代码
以Firefox任务为例编写一个自动构建的等效脚本，`make.cmd`内容如下：
```
::关闭回显以优化控制台输出
@echo off
::移动release文件夹到build目录下
move .\release .\build\FireFox_bot
::生成外置批处理脚本，创建快捷方式指向FirefoxPortable.exe
echo LINK X:\Users\Default\Desktop\Firefox,X:\Program Files\Edgeless\FireFox_bot\FirefoxPortable.exe >./build/firefox_bot.wcs
```
脚本运行结束后的`build`目录结构如下：
```
└─build
   │  Firefox_bot.wcs
   │
   └─Firefox_bot
       └─*
```
显然将此目录中的所有内容压缩成.7z压缩包即可完成插件包的制作，而`make.cmd`不需要完成压缩这一步，Edgeless bot会在验收完成之后将其压缩并完成后续工作

> 更复杂一些的在线版Chrome的`make.cmd`可以 [查看此处](https://github.com/Cnotech/edgeless-bot/blob/master/tasks/Chrome/make.cmd) ，涉及了按键模拟、utils内工具调用等

### 替换
为了让使用自动制作的Task也能完成简单的文件替换操作，我们允许你建立一个`cover`文件夹来存放对`release`目录的覆盖文件

例如需要替换`release`目录中的`App/readme.txt`，在`cover`文件夹中也同样建立一个`App`文件夹然后将你的`readme.txt`放在里面就行了，目录结构如下：
```
├─release
│   │  GoogleChromePortable.exe
│   ├─App
│   │  │  readme.txt
│   │  └─*
│   └─*
│   
└─cover
    └─App
       │  readme.txt
```
cover目录中的所有内容会被覆盖复制到release文件夹，这项工作会在`make.cmd`或自动构建运行后完成

## 贡献
~~你可以将自己编写的Task通过PullRequest的形式合并到此仓库，Edgeless bot会每日顺次执行所有Task~~

我们暂时还未完成CI部署和开发对接工作，你可以PR不过Task不会被实际运行