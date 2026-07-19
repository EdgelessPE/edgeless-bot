# 每日 Serve Runner 迁移至 Linux

将每日 `serve` GitHub Actions runner 从 Windows 迁移到 Linux 前，需要完成以下工作：

- 将 workflow 的 PowerShell 命令和 Windows 路径改为 Linux shell 写法。
- 改用 Linux 版 `cloud139`，并确认登录、上传、删除等命令可正常工作。
- 在 workflow 中安装 `aria2c`、7-Zip、curl 等运行依赖。
- 将 `package.json` 中使用 `del` 的 `prepare` 脚本改为跨平台实现。
- 为 Inno Setup 解包增加平台适配：Windows 使用 `innounp`，Linux 使用 `innoextract`，并验证相关任务的解包目录结构。
- 统一处理任务配置中的 Windows 反斜杠路径，确保 `sourceFile`、`build_manifest` 等路径在 Linux 上能够正确解析。
- 检查文件名大小写，避免任务在 Linux 的大小写敏感文件系统上找不到文件。
- 修正少量依赖 shell 命令拼接或未正确引用含空格路径的代码。
- 使用 Linux runner 进行真实构建抽样，覆盖 Inno、递归解压、PortableApps、远程上传及数据库回传流程。
- 首次迁移先通过手动触发 workflow 验证，确认稳定后再启用每日定时执行。
