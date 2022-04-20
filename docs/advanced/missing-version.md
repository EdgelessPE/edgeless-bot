# 无版本号任务
无版本号任务是指无法通过爬虫获取到软件当前最新版本号的任务，需要在进行完整的制作流程 (Produce) 后通过读取可执行主程序文件的文件版本获取最新版本号。

由于**此类任务检查更新的开销较大**，因此 Edgeless Bot 仅会每周进行一次无版本号任务的检查更新。同时我们不建议添加体积较大且更新频率低的无版本号任务，并尽可能通过爬虫来获取版本号。

## 添加一个无版本号任务
无版本号任务的添加依然可以使用 CLI 进行，不过在被问及 “使用外置爬虫脚本” 时请选择 *是* ，并将 `scraper.ts` 文件的内容改为如下形式：
```ts
import {Ok, Result} from 'ts-results';
import {ScraperReturned} from '../../src/class';

export default async function (): Promise<Result<ScraperReturned, string>> {
	return new Ok({
		version: '0.0.0',
		downloadLink: 'http://localhost/file.exe',
	});
}
```

:::tip
通常来说无版本号任务的产生都是因为上游的软件发布页面制作不完善——不显示版本号且下载链接固定，因此直接将下载链接固定返回即可，通常来说没有必要再写一遍爬虫去爬取下载链接。
:::

然后将任务的 `config.toml` 文件末尾的 `[extra]` 表头激活，并将 `missing_version` 的值设置为**制作完成后**程序主程序的相对路径（Edgeless Bot 会读取此文件的文件版本号作为任务最新版本号），示例如下：
```toml
# 额外备注
[extra]
# require_windows = false
missing_version = "${taskName}/${taskName}.exe"
```

## 测试无版本号任务

使用以下命令测试你的无版本号任务：

```shell
yarn serve -d -f -t TASK_NAME
```