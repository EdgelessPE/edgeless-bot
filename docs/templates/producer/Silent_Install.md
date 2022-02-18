# Silent Install

* 入口：`Silent_Install`

追加静默安装参数运行下载到的文件(默认参数为 `/S`,可以通过 `producer_required.argument` 指定)

推荐的构建装箱单 : `${taskName}.wcs,${taskName}/${downloadedFile}`

## 必须提供的参数

无

## 可选的参数

### argument

* 类型：`string`
* 说明：静默安装参数

### deleteInstaller

* 类型：`boolean`
* 说明：是否在安装完成后删除安装包，不推荐启用
