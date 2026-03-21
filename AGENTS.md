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

---

## 代码风格

**注意：** 必须显式声明函数返回类型，禁止隐式 any。

---

## 命名规范

### 文件命名

- TypeScript 文件：`PascalCase.ts`（如 `GitHub_Release.ts`）
- 任务文件夹：软件名称（中英文混合，如 `Chrome`、`酷我音乐`）

### 类型/接口命名（PascalCase）

```
ScraperParameters / ResolverParameters / ProducerParameters
ScraperReturned / ResolverReturned / ProducerReturned
ScraperRegister / ResolverRegister / ProducerRegister
WorkerDataScraper / WorkerDataResolver / WorkerDataProducer
```

### 函数命名（camelCase）

使用描述性动词：`getExeVersion`、`parsePath`、`searchTemplate`、`validateConfig`

### 变量命名（camelCase）

`taskName`、`downloadLink`、`onlineVersion`

### 常量命名

参考 `src/const.ts`：`UPPER_SNAKE_CASE` 或 PascalCase（如 `CATEGORIES`）

---

## 导入规范

### 内部模块导入

```typescript
import { log, sleep } from "./utils";
import { Err, Ok, Result } from "ts-results";
import { TaskInstance } from "./class";
```

### 模板文件导入（从 templates/\*/ 到 src/）

```typescript
import { robustGet } from "../../src/network";
import { ScraperParameters, ScraperReturned } from "../../src/class";
import { coverSecret, log } from "../../src/utils";
```

### 类型导入

```typescript
import { TaskInstance } from "./class"; // 类型用普通 import
```

### 外部模块导入

```typescript
import axios from "axios";
import chalk from "chalk";
import shell from "shelljs";
```

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

### try-catch 模式

```typescript
try {
  json = (await robustGet(downloadLink, cfg)).unwrap();
} catch (e) {
  console.log(JSON.stringify(e));
  return new Err(`Error:Can't fetch ${downloadLink}`);
}
```

### 日志消息格式

```
Error:描述性错误消息
Warning:警告消息
Info:信息消息
Success:成功消息
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
require_windows = true
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
