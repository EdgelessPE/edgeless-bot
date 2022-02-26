# Global Page Match

* 类型：爬虫
* 入口：`Global_Page_Match`
* 适用 URL：`通用`

使用给定的正则表达式匹配 html 文件中的文本内容,通过在 `scraper_temp.download_selector` `scraper_temp.version_selector` 中指定 jQuery 选择器缩小匹配范围

## 必须提供的参数

无

## 可选的参数

### version_page_url

* 路径：`scraper_temp.version_page_url`
* 类型：`string`
* 说明：版本号发布页面 URL，缺省使用上游 URL (`task.url`)

### download_page_url

* 路径：`scraper_temp.download_page_url`
* 类型：`string`
* 说明：下载链接发布页面 URL，缺省使用上游 URL (`task.url`)

### version_selector

* 路径：`scraper_temp.version_selector`
* 类型：`string`
* 说明：一个用于缩小查找版本号范围的 jQuery 选择器

### download_selector

* 路径：`scraper_temp.download_selector`
* 类型：`string`
* 说明：一个用于缩小查找下载链接范围的 jQuery 选择器
