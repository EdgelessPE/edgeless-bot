# 内置变量

为了减少不必要的输入或是动态计算某些值，你可以在任务配置的多个键值中使用内置变量。内置变量会在 Edgeless Bot 运行时动态地被替换为其对应的值。

## 可用变量

内置变量的表达形式为 `${KEY}`，下方列出了可用的内置变量：

### 任务名称

使用 `${taskName}` 代指任务名称，值来自于任务配置中的键 `task.name`。

示例：
在 `parameter.build_manifest` 中使用任务名称变量

```toml
# 任务基本信息
[task]
name = "Edgeless Hub"

# 通用参数
[parameter]
# 等价于 ["Edgeless Hub.wcs", "Edgeless Hub/Edgeless Hub.exe"]
build_manifest = ["${taskName}.wcs", "${taskName}/${taskName}.exe"]
```

### 下载到的文件名

使用 `${downloadedFile}` 代指下载到的文件名。

示例：
在 `parameter.build_manifest` 中使用下载到的文件名变量

```toml
# 任务基本信息
[task]
name = "Edgeless Hub"

# 通用参数
[parameter]
# 假设下载的文件名为 "edgeless-hub.exe"
# 等价于 ["Edgeless Hub.wcs", "Edgeless Hub/edgeless-hub.exe"]
build_manifest = ["${taskName}.wcs", "${taskName}/${downloadedFile}"]
```

### 最新版本号

使用 `${latestVersion}` 代指最新版本号，值来自于爬虫的返回结果。

:::tip
当此变量用于正则表达式时，为了防止 `.0` 导致的匹配失败问题，Edgeless Bot 会自动将 `.0` 处理为 `(\.0)*` ，同时将其他位置的 `.` 处理为 `\.`。
:::

示例：
在 `regex.download_name` 中使用最新版本号变量

```toml
# 使用到的正则
[regex]
# 假设最新版本号为 "2.21"
# 等价于 'Edgeless Hub_Beta_2\.21\.exe'
download_name = 'Edgeless Hub_Beta_${latestVersion}\.exe'
```

## 使用范围

在任务配置(`config.toml`)中合适的位置基本都可以使用相应的内置变量。详细使用范围如下：

- `regex.download_name` (注：`${downloadedFile}` 无法使用)
- `parameter.build_delete`
- `parameter.build_manifest`
- `extra.missing_version`
