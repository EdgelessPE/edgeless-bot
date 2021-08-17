# 外置爬虫的自动构建
为制作软件源不在PortableApps上的插件包，Edgeless Bot引入了外置爬虫的任务模板

## 任务配置
这类任务的`config.json`需要将`externalScraper`键设置为`true`，不需要提供`["paUrl","releaseRequirement","buildRequirement","preprocess"]`这几个无效键

此时，Bot默认不会尝试解压下载得到的文件；如果需要，请将`releaseInstaller`键设置为`true`，则Bot会将文件解压至工作目录的`release`子目录中；此方法可帮助验证无MD5信息的源文件正确性
## 爬虫接口脚本
任务的爬虫接口脚本名为`scraper.ts`，放置于任务文件夹根目录中
### 实现
此脚本需要实现三个方法：`init()` `getVersion():string`和`getDownloadLink():string`，分别用于初始化、获取最新版本号、获取下载链接；我们推荐在`init()`中完成爬取工作并将结果或中间数据缓存
### 引用
脚本需要自行引用需要的npm包或方法，我们提供了一些常用的引用示例
```javascript
//axios
import axios from 'axios';

//cheerio，jQurey的DOM部分实现
import cheerio from 'cheerio';

//延时函数，用法sleep(1000)
import sleep from '../../src/sleep';

//格式化输出控制台，用法log("Info:This is a demo info message")，仅允许"Info"、"Warning"、"Error"三种开头
import log from '../../src/utils';
```

## 示例
请查看QQ官方版的`scraper.ts`