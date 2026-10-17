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

### allow_pre_release

- 路径：`scraper_temp.allow_pre_release`
- 类型：`boolean`
- 说明：缺省状态下，模板会自动忽略预发布的 Release，设置为 `true` 则会将预发布的 Release 也纳入爬取范围

### release_tag_regex

- 路径：`scraper_temp.release_tag_regex`
- 类型：`string`
- 说明：仅选择标签匹配该正则表达式的 Release。此条件也会传递给 GitHub Release 解析器，确保版本号与下载文件来自同一个发布渠道。

### release_asset_regex

- 路径：`scraper_temp.release_asset_regex`
- 类型：`string`
- 说明：仅选择包含匹配附件名的 Release，跳过尚未上传目标附件的版本，并继续翻页查找。通常应与 `regex.download_name` 保持一致，确保版本号与下载文件属于同一版本。未设置时保持原有行为。
