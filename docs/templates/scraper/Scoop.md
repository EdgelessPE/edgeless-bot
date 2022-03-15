# Scoop

- 类型：爬虫
- 入口：`Scoop`
- 适用 URL：`https?://scoop.sh/[^/]+`

  使用给定的名称于 scoop bucket 中查询下载路径，使用 `scraper_temp.bucketName` 缩小范围

  爬虫会使用 taskName 到 scoop bucket 匹配应用，请确保 taskname 与 scoop bucket 中一致

## 必须提供的参数

### bucketName

- 路径：`scraper_temp.bucketName`
- 类型：`string`
- 说明：目前可用 Bucket： Main、Extras、games、java、nirsoft

## 可选的参数

无
