# Recursive Unzip

* 类型：制作器
* 入口：`Recursive_Unzip`

根据指定的 `recursiveUnzipList` 递归地解压下载得到的文件，然后在桌面上创建一个快捷方式指向 `sourceFile`

推荐的构建装箱单 : `${taskName}.wcs,${taskName}/"sourceFile"`

## 必须提供的参数

### shortcutName

* 路径：`producer_required.shortcutName`
* 类型：`string`
* 说明：在桌面上创建的快捷方式名称

### sourceFile

* 路径：`producer_required.sourceFile`
* 类型：`string`
* 说明：创建的快捷方式指向的可执行文件文件名，这个文件应当位于最后一次解压得到的文件夹内

### recursiveUnzipList

* 路径：`producer_required.recursiveUnzipList`
* 类型：`Array<string>`
* 说明：递归解压路径列表，在下载到的文件内**文件夹名**或某个压缩包的文件名链；支持被 `//` 包裹的正则表达式 (如果只需要单次解压下载到的文件则将其置为空数组)

## 可选的参数

无