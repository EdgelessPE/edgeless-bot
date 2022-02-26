# 构建与远程

在制作器模板完成制作后，Edgeless Bot 会验收就绪目录，然后将其中的内容压缩并存放到构建存储目录中（默认为 `./builds`，可以通过配置文件中的 `DIR_BUILDS` 修改）的对应分类名文件夹内。如果启用了远程功能，随后 Edgeless Bot 会将其上传到远程存储中的对应分类名文件夹内。

:::tip
注意区分 任务配置 和 配置文件，他们的文件名均为 `config.toml`。前者指某个任务的配置，文件位于任务文件夹内；后者指 Edgeless Bot 本体的配置，文件位于项目根目录中。
:::

## 构建

构建文件会以 .7z 格式压缩，默认名称遵循 Edgeless 插件包命名规范（`任务名称_版本号_任务作者.7z`）。Edgeless Bot 会根据配置文件中给定的 `MAX_BUILDS` 从本地和远程删除冗余的历史版本。

## 远程

远程功能通过调用 [rclone](https://rclone.org/) 命令行实现，因此如果启用远程功能则在运行 Edgeless Bot 之前需要预先在 rclone 中添加远程存储。

首先确保你已经[安装 rclone](./usage.md#rclone-选装)，然后在终端中运行命令 `rclone config`，输入 `n` 并回车创建一个新的远程存储。详细步骤见 [rclone 官方教程](https://rclone.org/docs/)。

创建完成后修改 Edgeless Bot 配置文件，将 `REMOTE_NAME` 改为在 rclone 中配置的存储名称，`REMOTE_PATH` 改为远程的 builds 存放目录。
