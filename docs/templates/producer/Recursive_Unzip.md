# Recursive Unzip

- 类型：制作器
- 入口：`Recursive_Unzip`

根据指定的 `recursiveUnzipList` 递归地解压下载得到的文件，然后在桌面上创建一个快捷方式指向 `sourceFile`

推荐的构建装箱单 : `${taskName}.wcs,${taskName}/"sourceFile"`

## 必须提供的参数

### shortcutName

- 路径：`producer_required.shortcutName`
- 类型：`string`
- 说明：在桌面上创建的快捷方式名称

### sourceFile

- 路径：`producer_required.sourceFile`
- 类型：`string`
- 说明：创建的快捷方式指向的可执行文件文件名，这个文件应当位于最后一次解压得到的文件夹内；支持被正斜杠（ `//` ）包裹的正则表达式

### recursiveUnzipList

- 路径：`producer_required.recursiveUnzipList`
- 类型：`Array<string>`
- 说明：递归解压路径列表，在下载到的文件**内**文件夹名或某个压缩包的文件名链；如果只需要单次解压下载到的文件则将其置为空数组。支持被 `//` 包裹的正则表达式。
- 示例：

假设下载得到的文件是这样的

![](https://cloud.edgeless.top/picbed/wiki/bot/recursiveUnzipList.png)

由于 `下北泽.7z` 是直接下载的文件，因此默认会被解压，将此文件中的子目录和子压缩包名称填入即可：

```toml
recursiveUnzipList = ['下北泽','池沼','雷普先辈！.7z']
```

如果需要使用正则表达式匹配，例如匹配一个文件名类似于 `雷普先辈！_ver 1.1.4.7z` 的压缩包则使用正斜杠（ `//` ）包裹正则表达式：

```toml
recursiveUnzipList = ['下北泽','池沼','/雷普先辈！_ver\.*\.7z/']
```

## 可选的参数

### launchArg

- 路径：`producer_required.launchArg`
- 类型：`string`
- 说明：创建的快捷方式启动参数

### noDesktop

- 路径：`producer_required.noDesktop`
- 类型：`boolean`
- 说明：不创建桌面快捷方式

### addStartMenu

- 路径：`producer_required.addStartMenu`
- 类型：`boolean`
- 说明：在开始菜单中按照软件分类创建快捷方式

### addPath

- 路径：`producer_required.addPath`
- 类型：`boolean`
- 说明：添加释放后的路径到用户级别的环境变量 PATH 中

### addMachinePath

- 路径：`producer_required.addMachinePath`
- 类型：`boolean`
- 说明：添加释放后的路径到系统级别的环境变量 PATH 中

### addAppPath

- 路径：`producer_required.addAppPath`
- 类型：`boolean`
- 说明：添加快捷方式指向的可执行文件到用户级别的 AppPath 注册表中

### addMachineAppPath

- 路径：`producer_required.addMachineAppPath`
- 类型：`boolean`
- 说明：添加快捷方式指向的可执行文件到系统级别的 AppPath 注册表中
