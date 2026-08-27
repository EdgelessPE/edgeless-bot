# Redirection Parse

- 类型：爬虫
- 入口：`Redirection_Parse`
- 适用 URL：`通用`

解析一个重定向的永久链接来获得版本号和下载直链,通过 `scraper_temp.redirection_url` 指定 URL

## 必须提供的参数

### redirection_url

- 路径：`scraper_temp.redirection_url`
- 类型：`string`
- 说明：指定被解析的 URL 链接

## 可选的参数

### download_url

- 路径：`scraper_temp.download_url`
- 类型：`string`
- 说明：指定实际下载地址。配置后，模板仍通过 `redirection_url` 解析版本号，但将此地址作为下载直链返回；适用于版本来源与下载地址不同的场景
