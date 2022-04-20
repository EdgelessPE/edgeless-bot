# Scoop

- 类型：爬虫
- 入口：`Scoop`
- 适用 URL：`https?://scoop.sh/[^/]+`

在指定的 Scoop Bucket 中查询下载路径信息，需要伪造一个适用 URL
:::tip TODO
通常来说上游 URL 必须是能访问的有效 URL 地址，因此建议将适用 URL 改为 Scoop Manifest 地址并从地址解析 Bucket 和 Name
:::

## 必须提供的参数

### bucketName

- 路径：`scraper_temp.bucketName`
- 类型：`string`
- 说明：目前支持的 Scoop Bucket： Main、Extras、games、java、nirsoft

### scoopManifestName

- 路径：`scraper_temp.scoopManifestName`
- 类型：`string`
- 说明：指定在 Scoop Bucket 中的软件名称

## 可选的参数

无