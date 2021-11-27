# 外置爬虫的自动构建

为制作软件源不在PortableApps上的插件包，Edgeless Bot引入了外置爬虫的任务模板

## 任务配置

### 通用

这类任务的`config.json`需要将`externalScraper`键设置为`true`，并提供`externalScraperOptions`
对象配置相应参数；不需要提供`["paUrl","preprocess"]`这几个无效键

此时，Bot默认不会尝试解压下载得到的文件；如果需要，请将`externalScraperOptions.releaseInstaller`键设置为`true`，则Bot会将文件解压至工作目录的`release`
子目录中；此方法可帮助验证无MD5信息的源文件正确性

如果不启用自动制作（`autoMake`），则需要提供`buildRequirement`键；如果启用了解压安装包（`externalScraperOptions.releaseInstaller`
），则需要提供`releaseRequirement`键；否则这两个键可以省略

### 自动制作

当`autoMake`的值为`true`时（让Bot自动制作），必须指定`externalScraperOptions.policy`键用于配置策略，合法的值如下：

* `silent`，此时的外置批处理策略为追加静默安装参数安装，然后删除安装包；可以通过`externalScraperOptions.silentArg`指定静默安装参数，缺省值为`/S`
* `manual`，此时的外置批处理策略为在桌面生成运行安装包的快捷方式；可以通过`externalScraperOptions.manualShortcutName`指定生成的快捷方式名称，缺省值为`安装TaskName`

### 选项

```typescript
interface ExternalScraperOptions {
    //配置策略,可为silent,manual
    policy?: string
    //是否需要解压安装包
    releaseInstaller?: boolean
    //更改静默安装参数，前面不需要留空格
    silentArg?: string
    //压缩等级，1-9，1为仅存储，9为极限压缩
    compressLevel?: number
    //静默安装结束后是否删除安装包，默认删除
    silentDelete?: boolean
    //手动安装时使用的快捷方式名
    manualShortcutName?: string
}
```

## 爬虫接口脚本

任务的爬虫接口脚本名为`scraper.ts`，放置于任务文件夹根目录中

### 实现

此脚本需要实现三个方法：`async init()` `getVersion():string`和`getDownloadLink():string`，分别用于初始化、获取最新版本号、获取下载链接；

你需要在`async init()`中完成爬取工作并将结果或中间数据缓存，并将`getXXX()`方法的逻辑改为直接返回缓存

`getVersion():string`允许返回包含版本号的文本，例如`QQ PC版9.4.9`，Bot会自动匹配其中的版本号

如果可以爬取到MD5，我们推荐增加一个可选方法`getMD5():string`用于获得下载到安装包的MD5

### 引用

脚本需要自行引用需要的npm包或方法，我们提供了一些常用的引用示例

```typescript
//axios
import axios from 'axios';

//cheerio，jQurey的DOM部分实现
import cheerio from 'cheerio';

//延时函数，用法await sleep(1000)
import sleep from '../../src/sleep';

//格式化输出控制台，用法log("Info:This is a demo info message")，仅允许"Info"、"Warning"、"Error"三种开头
import {log} from '../../src/utils';
```

## 示例

请查看“QQ” "TIM" "Wechat" "火绒安全"等任务
