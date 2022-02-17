# 介绍

Edgeless Bot 是一个模板驱动的多线程组件式上游软件源看门狗机器人，可以高效地监视各个官方发布页面以获取最新版的上游软件。基于模板的设计可以最大程度地重用处理同类型工作的代码。

Edgeless Bot 的远程功能通过调用 rclone 命令实现，支持本地存储、FTP、OneDrive、Google Drive等五十多种存储方式，访问 [rclone](https://rclone.org/) 官方网站了解详情。

## 起步

克隆此仓库并执行 `yarn & yarn serve -d` 即可快速开始，详情请见[安装](usage.md)。

## 性能

Edgeless Bot 使用了 Node.js Worker 线程池 [piscina](https://github.com/piscinajs/piscina) 以获取尽可能高的效率，在同时执行大量任务时相比较于上一代 Bot 性能有了大幅度的提升。同时，为了保证整体流程的顺畅运行和不对上游服务器产生过大的瞬时负载，也根据实际需要对部分操作进行了并发限制。

## 模板

Edgeless Bot 基于三种模板完成看门狗任务：

* 爬虫 (Scraper)
* 解析器 (Resolver)
* 制作器 (Producer)

### 爬虫
* 输入：一个 URL 和一些其他参数
* 输出：最新版本号、下载链接(不一定是直链)和可选的其他信息

爬虫模板用于在同一类内容发布站点(例如 GitHub Release)爬取上游的软件版本号、下载链接、校验信息等。

### 解析器(可选)
* 输入：一个需要解析直链的存储介质 URL 和一些其他参数
* 输出：直链

解析器模板用于解析各类云盘或其他类型的存储介质(例如 OneDrive)，使用正则表达式匹配需要的文件并提供可供下载器直接下载的直链。

### 制作器
* 输入：工作目录路径、下载文件的文件名和一些其他参数
* 输出：等待验收的目录路径

制作器模板用于规范化处理下载得到的文件，例如将其按照某种方式放置并执行测试。

## 流程
下方的流程图描述了 Edgeless Bot 的工作流程，其中蓝色的部分是 Edgeless Bot 本体提供的功能，棕色部分是 Edgeless Bot 在运行过程中动态生成、维护的部分，其他部分由模板提供。

![](https://pineapple.edgeless.top/picbed/bot/bot-next.png)