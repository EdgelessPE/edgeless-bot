# 制作器

制作器模板用于在下载完成后规范化处理下载得到的文件，例如将其按照某种方式放置并执行测试。制作器模板需要返回一个就绪目录（通常为 `_ready`），此目录会提交给 Edgeless Bot 进行验收，然后其中的内容会被压缩上传。

## 定义必要对象

由于制作器模板通常是通用模板，因此为了实现部分参数的差异化，你可以要求任务作者在配置的 `producer_required` 表中提供一些参数，这些参数会包裹在 `requiredObject` 对象内传递到制作器模板，Edgeless Bot 会确保任务提供的参数满足你的要求。

你需要编写一个 [Json Schema](https://json-schema.org/) 文件实现对 `requiredObject` 对象中包含键的申明，这个文件保存在 `schema/producer_templates/${entrance}.json`。使用 CLI 程序创建制作器模板时会自动生成这个文件。
:::tip
如果你不需要用户指定`requiredObject` 对象，请不要删除这个文件，这会导致 Edgeless Bot 认为是你遗漏了模式申明。相应地，请将这个文件的内容改为：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {}
}
```

:::

## 工作目录

传入的参数中有一个 `workshop` 变量，此变量表明了制作器模板的工作目录。开始时，此目录中仅有下载到的文件，其文件名通过传入的 `downloadedFile` 告知。

## 典型步骤

1. 使用 [shelljs](https://github.com/shelljs/shelljs) 创建就绪目录 `_ready`，就绪目录中包含一个名为任务名称的子文件夹

```typescript
const contentDir = path.join(workshop, "_ready", taskName);
shell.mkdir("-p", contentDir);
```

2. 对下载到的文件进行处理，将需要的文件放置到 `_ready/${taskName}` 目录内，然后在 `_ready` 目录内填充一个包信息文件（在初代 Edgeless 插件包中指外置批处理 `.wcs` `.cmd` 文件）

```typescript
//示例：将下载到的文件移动到_ready/${taskName}
shell.mv(
  path.join(workshop, downloadedFile),
  path.join(workshop, "_ready", taskName),
);
//示例：使用writeGBK函数写外置批处理文件
writeGBK(
  path.join(workshop, "_ready", taskName + ".wcs"),
  `LINK X:\\Users\\Default\\Desktop\\${shortcutName},%ProgramFiles%\\Edgeless\\${taskName}\\${downloadedFile}`,
);
```

3. 完成制作过程并进行简单自检（检查文件缺失等）后，在结尾将就绪目录的相对（于工作目录的）路径打包在 `Result` 类型中返回

```typescript
return new Ok({
  readyRelativePath: "_ready",
});
```

## 传入参数

制作器传入参数类型的定义如下：

```typescript
interface ProducerParameters {
  taskName: string;
  version: string;
  workshop: string;
  downloadedFile: string;
  requiredObject: any;
}
```

`requiredObject` 对应任务配置中的 `producer_required` 表，即必要对象。

## 返回类型

制作器返回类型的定义如下：

```typescript
interface ProducerReturned {
  readyRelativePath: string;
  mainProgram?: string;
  flags?: string[];
}
```
