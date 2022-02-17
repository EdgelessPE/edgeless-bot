# 爬虫

爬虫模板通常用于某一类网站，通常是同一域名下由 CMS 自动生成页面的网站。当然你也可以开发一个通用模板来处理一些常见的页面。

## 典型步骤

1. 使用 `robustGet` 函数获取 URL 页面（对于 `.unwarp()` 的解释见 [Result 类型](./general.md#result-%E7%B1%BB%E5%9E%8B)）

```typescript
let page = (await robustGet(url)).unwarp();
```

2. 使用 [cheerio](https://github.com/cheeriojs/cheerio) 挂载页面进行处理（操作方法同 jQuery）

```typescript
const $ = cheerio.load(page);
```

3. 爬取到最新版本号、下载地址等信息后，在结尾将其打包在 `Result` 类型中返回

```typescript
return new Ok({
  version: "0.0.0",
  downloadLink: "http://localhost/file.exe",
});
```

## 传入参数

爬虫传入参数类型的定义如下：

```typescript
interface ScraperParameters {
  taskName: string;
  url: string;
  downloadLinkRegex?: string;
  versionMatchRegex?: string;
  scraper_temp?: any;
}
```

如果需要任务提供 `downloadLinkRegex`，请在[注册模板](./general.md#注册模板)时向 `requiredKeys` 中增加元素 `regex.download_link`；如果需要任务提供 `versionMatchRegex`，请在注册模板时向 `requiredKeys` 中增加元素 `regex.scraper_version`。

`scraper_temp` 对应任务配置中的 `scraper_temp` 表，你可以在注册模板时向 `requiredKeys` 中增加元素 `scraper_temp.xxx` 来要求任务提供某些自定义参数。

:::tip
对于此表中的内容，Edgeless Bot 仅提供缺失校验，不会校验值类型，使用其中的值可能会导致 JavaScript 运行时异常，因此其名称中带 "temp"且命名风格与其他参数不同。
:::

## 返回类型

爬虫返回类型的定义如下：

```typescript
interface ScraperReturned {
  version: string;
  downloadLink: string;
  validation?: {
    type: ValidationType;
    value: string;
  };
  resolverParameter?: {
    entrance?: string;
    password?: string;
    cd?: string[];
  };
}
```

当爬虫能够获取到 MD5 或是 SHA-1 的校验信息时，可以通过 `validation` 对象传递校验信息。

如果需要指定解析器或向解析器传递信息，可以通过 `resolverParameter` 对象传递。其中 `entrance` 可以强制指定解析器入口，优先级高于任务指定的解析器或是自动选择的解析器；`password` 可以向解析器传递可能需要的存储介质访问密码；`cd` 可以强制覆盖任务给出的 `parameter.resolver_cd`。
