# 解析器

解析器模板通常用于解析存储介质（例如某些网盘）链接来选中所需文件并获取直链，当存储介质网址无法使用简单的正则表达式表达时（例如有多个毫不相关的域名）请创建一个通用解析器模板。

## 典型步骤

1. 使用 `robustGet` 函数获取 URL 页面（对于 `.unwarp()` 的解释见 [Result 类型](./general.md#result-%E7%B1%BB%E5%9E%8B)）然后通过 [cheerio](https://github.com/cheeriojs/cheerio) 挂载页面进行处理（操作方法同 jQuery）

```typescript
let page = (await robustGet(downloadLink)).unwarp();
const $ = cheerio.load(page);
```

或是通过向存储介质 API 接口发送请求获取更多信息

```typescript
let res = (await robustGet(`https://xxx/api?xxx=XXX`)).unwarp();
```

2. 通过 `cd` 和 `fileMatchRegex` 等信息匹配到需要的文件
   :::tip
   如果任务未指定 `cd`，默认处理策略是遍历全部文件夹然后使用 `fileMatchRegex` 匹配所有文件

如果给定的 `fileMatchRegex` 能匹配到多个文件，默认处理策略是取第一个并输出警告提醒任务作者更新 `regex.download_name`
:::

3. 获取到文件直链后，在结尾将其打包在 `Result` 类型中返回

```typescript
return new Ok({
  directLink: "http://localhost/file.exe",
});
```

## 传入参数

解析器传入参数类型的定义如下：

```typescript
interface ResolverParameters {
  downloadLink: string;
  fileMatchRegex: string;
  cd?: Array<string>;
  password?: string;
}
```

`cd` 的含义与终端上的 cd 命令相似，依次进入目录并在最终指定的目录内查找文件。
`password` 则用于指定可能需要的存储介质访问密码。
:::tip
当任务给定的 `cd` 或是 `password` 等参数有误时应当立即返回错误（例如 `return new Err("Error:Parameter xxx error")`）而不是尝试忽略此参数，这样便于爬虫模板作者或任务作者调试自己的代码。
:::

## 返回类型

解析器返回类型的定义如下：

```typescript
interface ResolverReturned {
  directLink: string;
}
```
