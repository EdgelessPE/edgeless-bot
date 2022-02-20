<h1 align="center">
  <img alt="logo" src="https://pineapple.edgeless.top/picbed/wiki/bot/logo.ico" width="150"/>
  <br>
  Edgeless Bot
</h1>

<h4 align="center">模板驱动的组件式上游软件源看门狗</h4>

<p align="center">

<a href="https://github.com/EdgelessPE/edgeless-bot/actions/workflows/serve.yml">
  <img src="https://github.com/EdgelessPE/edgeless-bot/actions/workflows/serve.yml/badge.svg?branch=next" alt="workflow status">
</a>
<br/>
<a href="https://github.com/EdgelessPE/Edgeless">
  <img src="https://img.shields.io/badge/Edgeless-ecosystem-blue?style=aquart&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsSAAALEgHS3X78AAAEh0lEQVRYhb1XX0hbVxj/nXPPjcZkJlPrnJUprNqtqcNYpkVGmbTgSyj4sM51lKKD/aHUbfWhvkgZsqEP60Nd2T/WUkZp6WCCBIrrit0GRd3Qkpp2s27qqumMUZPWNDG595w92GhMvfemTvaD+3DP953v97vfOd893yFIE28fv2Qbmb3visfVWq7CCYJiVVXtACBJUhACk1TCsCxLfTu3ZLu/6jwQSicuMXLYe+RcWXBxqTUW4w1CCHNaQQmJmEz0ot2a0XH19OHRDQlwnejJ8v090x5dUo4KATkd4seFIJ6ZwboKn3umzf3R/odpC9jTfL40EFrsVhTh2AhxKhgj3jybtf7nU2/eMRSw+8i3lYEHkV4uRF6qo9B4T7WtR0IoCeRZzXX9pw8NaQqobj5f6r8fvp5KvlmghATysy01A0mZWBHgOtGTddPnH1QUvilp1wJj1FtemF+V2BMsYRiZnWuPcuEANSyMdSGQRkkBULhwjMzOtQNoQWLOS60Xyqbnw14BsNQgyev8XwQk2wmgFOZYHJ6ON0YZAPjDsVaFEqY9fRnP52fj3dodKM59ysgV3UPjuNA/pmVm/nCsFUAT29dxxTZwd6qBG6T+YPU2dB2sQQaTDMkBwONbgKITM8x5w76OKx8yz5zfFafErJfAV0sL8MWhV0BJ+vtDUAJVopp2FTB75vwuFhWoVam2IwA07925hrz3tg/feyYhdIrfM70Ao7hRgVoWA5zcwDHPmrk6Ka6i/uxPiClcdw4AwCBuDHAyIUklHPrBRFLmCSH4xFWJ1X2dmoblsZ5bPlz7c0Y/rkRLWBzUJgxrf9WewSg+2LPdwB+YerCEvvGArk8cxMZAJeguZoqAtEEoQA0qhhAwWWKhJS5ydA+UFP6Pr41C5SlmsvY7+u8GAar/a5EpCTFQNkEhctbhAVZErbV0/jKOcEzRDQ4A1EAAKJlgJmYaVhReqeVDAIzNR1BVZF8Z+7FxNy7fmdVduZlwDF//NqXLb2J0mJmYqS/K1bf0HD8b9OH18gJIj/4FVUU2VBXZdIN7ZhbxzZB+FZiY1EeduRY3k+QIlWRoPUP/RPD+5b+gcqPNmgyiGY9KMmRJjjhzLW4CALmdA2ciimhcXev1iAgqCixorNiComwTjCpjIhhFyw+T0OqbzIycnTte3UQA4IWuW2W+cNQrBAxPxM0AgVAKrWbH70d3jK58xrMnvZ9G4vzY/yHALNOT9445WoCkjmiXxd42uLhYpwost2TptjhPCInAu8tibXM/el9DUfH5WOm9KLnOBXniptSoM14mF4GCTFFz471tjzelCZR/OVE5H6G9qiB5mmcNsDZDWv160pgEEcgx87qb75Rot+UJVJzxly6ElW6Fk825mFDhfdrC6m805RtfTBJw9Uxn/TFtal9SRLOAcb+4HgiEksHIqe1bY23u/VvTv5ol4+VzobLQQ7U1zkkDF0jrckoJIjIVF21ZUsevh20bu5ym4rVLwnY7GHIpgtSqHE5CSLHChR0AGCVBIcSkRDHMiOh70W5zf3eApHU9/xc9ebLTElloFwAAAABJRU5ErkJggg==" alt="Ecosystem">
</a>
<img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=TypeScript&logoColor=white" alt="typescript">
<img src="https://img.shields.io/badge/github%20actions-%232671E5.svg?style=flat&logo=githubactions&logoColor=white" alt="GitHub Actions">

</p>

## 介绍

Edgeless Bot 是一个模板驱动的多线程组件式上游软件源看门狗机器人，可以高效地监视各个官方发布页面以获取最新版的上游软件。基于模板的设计可以最大程度地重用处理同类型工作的代码。

Edgeless Bot 的远程功能通过调用 rclone 命令实现，支持本地存储、FTP、OneDrive、Google Drive 等五十多种存储方式，访问 [rclone](https://rclone.org/) 官方网站了解详情。

## 起步

克隆此仓库并执行 `yarn & yarn serve -d` 即可快速开始，详情请见[安装与使用](https://wiki.edgeless.top/bot/guide/usage.html)。

## 文档

访问 [https://wiki.edgeless.top/bot/](https://wiki.edgeless.top/bot/)。

## 性能

Edgeless Bot 使用了 Node.js Worker 线程池 [piscina](https://github.com/piscinajs/piscina) 以获取尽可能高的效率，在同时执行大量任务时相比较于上一代 Bot
性能有了大幅度的提升。同时，为了保证整体流程的顺畅运行和不对上游服务器产生过大的瞬时负载，也根据实际需要对部分操作进行了并发限制。

## 模板

Edgeless Bot 基于三种模板完成看门狗任务：

- 爬虫 (Scraper)
- 解析器 (Resolver)
- 制作器 (Producer)

### 爬虫

- 输入：一个 URL 和一些其他参数
- 输出：最新版本号、下载链接(不一定是直链)和可选的其他信息

爬虫模板用于在同一类内容发布站点(例如 GitHub Release)爬取上游的软件版本号、下载链接、校验信息等。

### 解析器(可选)

- 输入：一个需要解析直链的存储介质 URL 和一些其他参数
- 输出：直链

解析器模板用于解析各类云盘或其他类型的存储介质(例如 OneDrive)，使用正则表达式匹配需要的文件并提供可供下载器直接下载的直链。

### 制作器

- 输入：工作目录路径、下载文件的文件名和一些其他参数
- 输出：等待验收的目录路径

制作器模板用于规范化处理下载得到的文件，例如将其按照某种方式放置并执行测试。

## 流程

下方的流程图描述了 Edgeless Bot 的工作流程，其中蓝色的部分是 Edgeless Bot 本体提供的功能，棕色部分是 Edgeless Bot 在运行过程中动态生成、维护的部分，其他部分由模板提供。

![](https://pineapple.edgeless.top/picbed/bot/bot-next.png)
