# GitHub Actions Runner 迁移至 Ubuntu

## 目标与范围

将以下 GitHub Actions workflow 从 `windows-2025` 迁移到 GitHub 托管的 `ubuntu-24.04` x64 Runner：

- `.github/workflows/serve.yml`：每日检查、构建、上传及数据库回传。
- `.github/workflows/debug.yml`：Pull Request 调试构建。

迁移后继续制作 Windows 软件包，但构建过程运行在 Ubuntu 上。任务未配置 `extra.require_windows`，或该值仍为注释时，均按 `false` 处理并允许在 Ubuntu 上执行；只有显式配置 `require_windows = true` 的任务才跳过。

## 第一阶段：代码与任务兼容性

### 1. 跨平台清理脚本

- 将 `package.json` 中使用 Windows `del` 命令的 `prepare` 脚本改为 Node.js、`shelljs` 或跨平台工具实现。
- 删除目标不存在时应正常完成，不得导致首次安装依赖失败。

验收：Windows 和 Ubuntu 上执行 `pnpm install --frozen-lockfile` 均成功。

### 2. Inno Setup 解包

- Windows 继续使用 `innounp`，Ubuntu 改用 `innoextract`。
- 将 `innoextract` 加入命令查找和平台预检，不能复用 `innounp` 的参数格式。
- 统一两种工具的输出目录结构，处理 `{app}`、代码常量目录及 `innoSetupRename`。
- 至少选择一个包含嵌套目录和重命名配置的 Inno 任务进行真实解包。

验收：同一安装包在两个平台生成的 `_ready` 目录均通过 `build_manifest` 检查。

### 3. 路径与文件名

- 为任务配置中的相对路径提供统一的规范化函数，覆盖 `sourceFile`、`build_manifest`、`build_delete`、`missing_version`、`build_cover` 等字段。
- 将 Windows 反斜杠转换为当前平台分隔符时必须替换全部分隔符，不能只替换第一个。
- 区分路径和正则表达式；`recursiveUnzipList` 中以 `/.../` 表示的正则不得按路径处理。
- 检查解包结果与配置中的文件名大小写，Ubuntu 上必须精确匹配。
- 检查包含空格、中文、`$PLUGINSDIR` 等特殊名称的路径。

验收：对全部任务运行配置扫描；抽样任务在 Ubuntu 上不存在因路径分隔符或大小写导致的文件缺失。

### 4. 任务平台策略

- 保持现有语义：缺省或注释的 `require_windows` 等于 `false`。
- 审查真正依赖 Windows 可执行程序、PowerShell、PECMD 或 Windows API 的任务，仅为这些任务显式设置 `require_windows = true`。
- Ubuntu 上应记录被跳过的任务名称，但不得把跳过计为构建失败。
- Ubuntu 使用 C 实现的 `peres`（Ubuntu `readpe` 包）读取 EXE/DLL 的 PE 固定版本资源，使 `missing_version` 任务可以正常参与检查和构建；Windows 保留现有读取方式，其他未实现的平台继续跳过。

验收：分别用一个普通任务、一个 `require_windows = true` 任务和一个 `missing_version` 任务验证执行、跳过与 PE 版本读取行为。

### 5. 外部命令调用

- 修正依赖 shell 字符串拼接、Windows 命令或未引用路径的代码。
- 优先使用 `execFile`、`execFileSync` 或 `spawn` 的参数数组调用外部程序，覆盖 aria2c、curl、7-Zip、innoextract、rclone 和 cloud139。
- 确保 URL、本地路径、远程路径和包含空格或中文的文件名不被 shell 拆分。
- 不得把 `CLOUD139_TOKEN` 等凭据写入日志；凭据中包含空格或 shell 特殊字符时仍应正常登录。

验收：使用带空格和中文的临时路径完成一次下载、解压、压缩和上传测试，日志中不出现完整凭据。

## 第二阶段：Workflow 改造

### 1. Runner 与基础环境

- 将 `serve.yml` 和 `debug.yml` 的 `runs-on` 改为固定的 `ubuntu-24.04`，避免 `ubuntu-latest` 升级造成环境漂移。
- 使用 Node.js 24，并通过 Corepack 启用仓库声明的 pnpm 9。
- 使用 `pnpm install --frozen-lockfile` 安装依赖。
- 使用 pnpm store 缓存，并让缓存键包含 Runner OS、Node 主版本和 `pnpm-lock.yaml` 哈希。

### 2. 系统依赖

- 通过 `apt` 安装 `aria2`、`7zip`、`curl`、`innoextract`、CA 证书等运行依赖。
- 安装 Linux x86_64 版 `rclone`，并部署现有远程数据库所需的 rclone 配置。
- 下载 Linux x86_64 版 `cloud139`，只接受与 Runner 架构一致的单个发布资产。
- 对下载的外部二进制执行校验和验证并设置可执行权限。
- 在运行程序前执行版本和可用性预检：`node`、`pnpm`、`aria2c`、7-Zip、`curl`、`innoextract`、`rclone`、`cloud139`。

验收：预检输出所有工具的实际路径和版本；缺少工具、架构不符或校验失败时立即终止 workflow。

### 3. Linux shell 与配置文件

- 将 PowerShell 的 `New-Item`、反斜杠路径和文件移动命令改为 Bash 写法。
- 创建 rclone/cloud 配置目录时使用明确的 Linux 路径和最小文件权限。
- 确认从私有 `Cnotech/rclone` 仓库取得的是 Linux 二进制和对应配置，而不是 Windows `.exe`。
- 避免使用不包含隐藏文件的宽泛复制方式；明确复制所需二进制和配置文件。

### 4. Workflow 安全与稳定性

- 为 workflow 设置最小 `permissions`。
- 为 `serve` 设置 `concurrency`，防止定时任务与手动任务同时覆盖远程文件或数据库；正在运行的生产任务不应被新任务随意取消。
- 为两个 workflow 设置合理的 `timeout-minutes`。
- 失败时保留必要日志；不得上传 token、rclone 配置或其他凭据。
- `debug.yml` 保持 Debug 模式，不启用远程上传和数据库更新。

## 第三阶段：验证

### 1. 静态验证

- 执行 `pnpm check`。
- 执行现有测试，并为路径规范化、平台任务筛选和 Inno 命令生成补充自动化测试。
- 校验两个 workflow 的 YAML 语法和引用的 action 输入。

### 2. Debug workflow

- 先将 `debug.yml` 迁移到 Ubuntu，通过 Pull Request 触发验证。
- 同时保留 `workflow_dispatch`，可使用 `task` 指定逗号分隔的任务，并通过 `force` 强制构建；强制构建仅用于迁移验收。
- 覆盖普通压缩包、Inno、递归解压和 PortableApps 任务。
- 确认 `require_windows = true` 与 `missing_version` 任务按预期跳过。

验证记录：

- 2026-07-20：GitHub 托管的 `ubuntu-24.04` Debug Runner 已通过环境检查并可正常执行任务；期间确认 Ubuntu `7zip` 包的命令为 `7z`。
- 尚待补充代表性任务矩阵及 Workflow Run 链接。

### 3. Serve workflow 手动验证

- 暂时保持每日定时任务停用，仅保留 `workflow_dispatch`。
- 使用强制构建和指定任务参数分别抽样：
  - 普通 7-Zip/ZIP 解包任务。
  - Inno Setup 任务。
  - 多层递归解压任务。
  - PortableApps 任务。
  - 包含空格或中文路径的任务。
- 验证 cloud139 登录、上传、列目录和删除。
- 验证 rclone 拉取数据库、回传数据库，并重新下载比对回传内容。
- 验证旧构建清理逻辑不会误删新构建或其他任务文件。

### 4. 启用定时运行

- 手动验证全部通过后恢复 `serve.yml` 的每日 schedule。
- 观察至少三次连续定时运行，确认无平台相关失败、任务卡死、重复上传或数据库覆盖。
- 三次运行稳定后移除迁移期间的临时调试输出。

## 回滚方案

- 迁移提交应保持 workflow 改动与代码适配可独立回退。
- 若 Ubuntu Serve 构建影响远程产物或数据库，立即停用 schedule，并将 `serve.yml` 恢复为 `windows-2025`。
- 回滚前保存失败日志和受影响任务列表；若本次运行已上传或删除远端产物，必须同步对应数据库状态，避免产物与索引错位。
- `debug.yml` 可继续保留 Ubuntu 用于排查，也可在阻断 Pull Request 时一并恢复 Windows Runner。

## 完成标准

满足以下条件后迁移才算完成：

- `serve.yml` 和 `debug.yml` 均运行在 `ubuntu-24.04`。
- 类型检查、自动化测试和 workflow 校验通过。
- 所有外部命令通过启动前预检，且使用 Linux x86_64 版本。
- 规定的构建类型和特殊路径任务均完成真实构建。
- cloud139 远程操作与 rclone 数据库拉取/回传通过验证。
- `require_windows`、`missing_version` 和普通任务的执行策略符合预期，Ubuntu 能从 PE 固定版本资源获得版本号。
- 至少三次连续每日运行成功，且没有数据库或远程产物异常。
