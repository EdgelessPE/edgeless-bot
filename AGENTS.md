# AGENTS.md - Edgeless Bot 开发指南

## 项目概述

Edgeless Bot 是一个模板驱动的多线程上游软件源监控机器人，使用 Node.js + TypeScript 构建。

**技术栈：** Node.js >= 24, TypeScript, pnpm >= 9

**目录结构：**

```
src/          - 核心源代码
tasks/        - 任务配置（每个任务一个文件夹，含 config.toml）
templates/    - 模板模块（scrapers/resolvers/producers）
scripts/      - 构建/工具脚本
schema/       - JSON Schema 验证
i18n/         - 国际化文件
docs/         - VitePress 文档
```

---

## 开发命令

```bash
# 构建并运行
pnpm serve        # 生产模式（tsc + node）
pnpm dev          # 调试模式（tsc + node + -d）
pnpm dev -t       # 调试某个任务

# 类型检查
pnpm check        # TypeScript 类型检查（tsc --noEmit）

# 格式化与 lint
pnpm fmt          # Prettier 格式化
pnpm lint         # ESLint 检查并修复

# 代码生成
pnpm new task     # 创建新任务（交互式）
pnpm new template # 创建新模板
pnpm new wiki     # 生成模板文档

# 文档
pnpm docs:dev     # VitePress 开发服务器
pnpm docs:build   # 构建文档

# 运行单个测试（如有）
pnpm test         # 运行测试
```

### 任务改动验证

修改 `tasks/` 下的任务后，必须使用 `pnpm dev -t "<任务名>"` 运行对应任务，验证爬取、下载、解析和制作流程能够完整成功；如果任务版本未变化导致跳过制作，则增加 `-f` 强制制作。不能只以命令退出成功作为验证结果，还必须检查 `builds/<分类>/` 中生成产物的大小是否合理，并使用 `7z l <产物路径>` 等方式核对压缩包内的目录结构、关键文件和 `build_manifest` 是否符合预期。

---

## 错误处理模式

### 使用 ts-results（推荐）

```typescript
import { Err, Ok, Result } from "ts-results";

// 返回错误
return new Err(`Error:Can't find matched scraper template for ${url}`);

// 返回成功
return new Ok(result);

// 检查结果
if (mRes.err) {
  log(mRes.val);
  success = false;
} else {
  const m = mRes.unwrap();
}

// 链式调用
const r = await robustGet(downloadLink, cfg).unwrap();
```

### 超时处理

```typescript
import { awaitWithTimeout } from "./utils";

const LIGHT_TIMEOUT = 30000; // 30 秒
const HEAVY_TIMEOUT = 300000; // 5 分钟

res = await awaitWithTimeout(script, LIGHT_TIMEOUT, null);
```

---

## 模板注册模式

每个模板目录包含 `*_register.ts` 文件，导出注册数组：

```typescript
import { ScraperRegister } from "../../src/class";

const regArray: Array<ScraperRegister> = [
  {
    name: "模板名称",
    entrance: "入口函数",
    urlRegex: "https://example\\.com/.+",
    requiredKeys: [],
  },
];

export default regArray;
```

---

## 注释规范

- 业务逻辑注释：使用中文
- 复杂逻辑注释：使用英文
- 注释以 `//` 开头，保持空格：`// 打印艺术字`

```typescript
// 打印艺术字
art();

// 按同域任务分类后使用线程池执行全部完成
```

---

## 类型声明

### 接口/类型定义

```typescript
interface ScraperReturned {
  version: string;
  downloadLink: string;
  validation?: { type: ValidationType; value: string };
  resolverParameter?: { entrance?: string; password?: string; cd?: string[] };
}

// 泛型用法
Result<ScraperReturned, string>;
Promise<Result<string, string>>;
```

### 类型强制转换

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
json = toml.parse(text) as TaskConfig;
```

---

## 任务配置（config.toml）

每个任务文件夹包含 `config.toml`：

```toml
[task]
name = "Chrome"
category = "浏览器"
author = "Cno"
url = "https://portableapps.com/apps/internet/google_chrome_portable"

[template]
producer = "External"

[regex]
download_name = '\.exe'

[parameter]
build_manifest = ["${taskName}.wcs", "GoogleChromePortable/GoogleChromePortable.exe"]
build_cover = "cover"

[extra]
# require_windows = true
```

### 内置变量

- `${taskName}` - 任务名称
- `${downloadedFile}` - 下载文件名
- `${latestVersion}` - 最新版本字符串

---

## 其他规范

- **严格模式**：TypeScript strict 模式开启，禁止隐式 any
- **ESLint**：使用 `prefer-template` 规则，优先使用模板字符串
- **文件编码**：保持一致的换行符（Prettier auto 处理）
- **导出模式**：支持命名导出和默认导出，根据场景选择
