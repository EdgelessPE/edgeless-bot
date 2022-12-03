# REST API

- 类型：爬虫
- 入口：`REST_API`
- 适用 URL：`通用`

通过 `scraper_temp.api_url` 指定 Json REST api 的 url ,并通过 `scraper_temp.version_path` `scraper_temp.download_path` 指定对象路径

## 必须提供的参数

### api_url

- 路径：`scraper_temp.api_url`
- 类型：`string`
- 说明：请求 API 地址

### version_path

- 路径：`scraper_temp.version_path`
- 类型：`string`
- 说明：版本号在返回的 Json 对象中的访问路径

### download_path

- 路径：`scraper_temp.download_path`
- 类型：`string`
- 说明：下载地址在返回的 Json 对象中的访问路径

## 可选的参数

### referer

- 路径：`scraper_temp.referer`
- 类型：`string`
- 说明：请求时可以在 `headers` 中携带的 `referer`
