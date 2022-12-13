# GitHub Release

- 类型：爬虫
- 入口：`GitHub_Release`
- 适用 URL：`https?://github.com/[^/]+/[^/]+`

爬取由 GitHub Release 发布的软件，注意使用 `regex.download_name` 筛选发布的文件
:::tip
预发布的 Release 会被忽略；

可以通过[环境变量](../../guide/usage.md#环境变量)注入 `GITHUB_TOKEN` 以增加请求频率
:::

## 必须提供的参数

无

## 可选的参数

无
