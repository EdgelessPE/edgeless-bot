# 概览

## 创建模板

与创建任务类似，我们也提供了 CLI 程序快速创建模板。运行 `yarn new template` 即可快速创建模板。

## 注册模板

创建模板时，CLI 程序会自动向模板存储目录的注册文件(`template/xxx/_register.ts`)注册模板。不同类型的模板注册时的数据结构会有所不同：

爬虫模板注册结构

```typescript
interface ScraperRegister {
  //昵称
  name: string;
  //入口，唯一标识一个模板的字符串，下同
  entrance: string;
  //匹配的URL正则表达式；
  //值为 "universal://" 时表示为通用模板
  urlRegex: string;
  //使用此模板的任务需要提供的键
  requiredKeys: Array<string>;
  //描述，当模板为通用模板时需要提供
  description?: string;
}
```

解析器模板注册结构

```typescript
interface ResolverRegister {
  //昵称
  name: string;
  //入口
  entrance: string;
  //匹配的URL正则表达式；
  //值为 "universal://" 时表示为通用模板
  downloadLinkRegex: string;
  //使用此模板的任务需要提供的键
  requiredKeys: Array<string>;
  //描述，当模板为通用模板时需要提供
  description?: string;
}
```

制作器模板注册结构

```typescript
interface ProducerRegister {
  //昵称
  name: string;
  //入口
  entrance: string;
  //默认的压缩级别，范围1-10，数字越大得到的压缩包越小、解压越慢
  defaultCompressLevel: number;
  //描述
  description: string;
  //（可选）推荐的构建装箱单
  recommendedManifest?: string[];
}
```

:::tip
爬虫与解析器模板的 `urlRegex` 和 `downloadLinkRegex` 均支持最大长度匹配，如果你的模板适用的 URL
同样适用于另一个模板时请尽可能使匹配长度最大，参考 `GitHub Release` 和 `Scoop` 爬虫模板
:::

## 编写模板

运行 CLI 程序后生成的空白模板可能如下所示：

```typescript
import { Ok, Err, Result } from "ts-results";
import { ScraperParameters, ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";
import { log } from "../../src/utils";

interface Temp {}

export default async function (
  p: ScraperParameters
): Promise<Result<ScraperReturned, string>> {
  const { taskName, url, downloadLinkRegex, versionMatchRegex, scraper_temp } =
    p;
  const temp: Temp = p.scraper_temp;

  //YOUR CODE HERE

  return new Ok({
    version: "0.0.0",
    downloadLink: "http://localhost/file.exe",
  });
}
```

模板中已经预置了基本变量的解构、常用函数的导入、自定义类型说明和默认导出函数的类型等声明。在 `//YOUR CODE HERE` 处编写你的代码，并修改结尾处的 `return new Ok` 语句返回你获得的值。

:::warning
不要随意修改爬虫模板中提供的 `interface Temp` 的接口名称 `Temp`，在生成文档时会根据这个接口中的申明生成部分内容。
:::

### Result 类型

Edgeless Bot 使用了 [ts-results](https://www.npmjs.com/package/ts-results) 库中的 `Result` 类型，在模板编写中的返回值也同样需要这一类型。

Result 类型的原型来源于 Rust 等编程语言。形象地来说，Result 类型要求函数返回所需要的值时将值打包在一个“盒子”中，这个盒子会被打上 “Ok” 或是 “Err”
标签来标记函数执行是否成功，同时也表明了盒子中的值的类型是所需要的值还是报错信息。

![](https://pineapple.edgeless.top/picbed/bot/result.png)

在编程时，使用 `new Ok(xxx)` 可以创建一个有“Ok”标记的盒子，而使用 `new Err(xxx)` 可以创建一个有“Err”标记的盒子。

当从某个函数接收到 `Result` 类型的返回值时，可以通过 `.unwrap()`
“打开盒子”获取到内部的 `Val`，不过对一个类型为 “Err” 的盒子执行 `.unwrap()` 则会引发一个 `throw`。你可以通过 `.ok` 或是 `.err` 这两个布尔值判断盒子类型，然后通过 `.val` 获取到盒子内的值。

详情请访问 [ts-results](https://github.com/vultix/ts-results)。

:::tip
在编写 Edgeless Bot 模板或外置脚本时，如果发生了错误请返回一个 `new Err("Error:REASON HERE")`
:::

### 常用函数

Edgeless Bot 提供了一些函数来规范化一部分的常用操作。

#### 网络

可以从 `../../src/network` 导入

**robustGet**

此函数是对 `axios.get` 的一个封装，顾名思义此函数有较好的健硕性，会在出错的情况下根据具体的配置自动重试请求过程。

**robustParseRedirect**

此函数可以用于解析一个指向 HTTP 301 或 HTTP 302 的链接的最终跳转位置，也具有较好的健硕性。

#### 工具

可以从 `../../src/utils` 导入

**log**

此函数可以用于格式化地向控制台输出日志。使用方法为 `log("LEVEL:CONTENT")` ，其中 `LEVEL` 的有效值为 `Info` `Warning` `Error`，`CONTENT` 表示日志内容。

**versionCmp**

此函数可以用于比较两个版本号的大小，**注意同时需要导入枚举类 `Cmp`**；`Cmp.L` 表示 `<`，`Cmp.E` 表示 `=`，`Cmp.G` 表示 `>`。

**writeGBK**

此函数通常用于制作器模板，用于以 GBK 编码写入某个文件。

#### jQuery

Edgeless Bot 使用 [cheerio](https://github.com/cheeriojs/cheerio) 代替 jQuery 对 DOM 进行处理，可以通过如下代码使用：

```typescript
import cheerio from "cheerio";
const $ = cheerio.load("HTML_PAGE_TEXT");
```

#### Shell

Edgeless Bot 使用 [shelljs](https://github.com/shelljs/shelljs) 提供部分常用的 Shell 命令，通常用于制作器模板，可以通过如下代码使用：

```typescript
import shell from "shelljs";
//示例：删除工作目录中的临时目录
shell.rm("-rf", path.join(workshop, "temp"));
```

#### 解压

Edgeless Bot 提供 7-Zip 的压缩和解压函数封装，其中解压函数 `release` 通常用于制作器模板，可以通过如下代码导入：

```typescript
import { release } from "../../src/p7zip";
```

:::tip
压缩函数通常不需要用到，因为 Edgeless Bot 会先验收制作器模板返回的就绪目录，验收通过后会由 Edgeless Bot 完成压缩上传的工作。
:::

## 生成文档

完成模板编写并使用示例任务测试后，你需要为你的模板编写使用文档。执行 `yarn new wiki` 运行一个 CLI 程序生成文档模板，然后在对应的模板中填充相关内容即可完成文档编写。
