/**
 * @type {import('vitepress').UserConfig}
 */
const config = {
  base: "/bot/",
  title: "Edgeless Bot",
  description: "Expandable upstream watchdog for like application stores",
  outDir: "docs-dist",
  head: [
    [
      "link",
      {
        rel: "icon",
        href: "https://cloud.edgeless.top/picbed/bot/logo.ico",
      },
    ],
  ],
  themeConfig: {
    repo: "EdgelessPE/edgeless-bot",
    docsRepo: "https://github.com/EdgelessPE/edgeless-bot",
    docsBranch: "next",
    editLinks: true,
    editLinkText: "在 GitHub 上编辑此页",
    docsDir: "docs",
    lastUpdated: "最近更新于",
    logo: "https://cloud.edgeless.top/picbed/bot/logo.ico",
    nav: [{ text: "Dashboard", link: "https://dashboard.wiki.edgeless.top" }],
    sidebar: {
      "/": getGuideSidebar(),
    },
  },
};

function getGuideSidebar() {
  return [
    {
      text: "基础",
      children: [
        { text: "介绍", link: "/guide/whats" },
        { text: "安装与使用", link: "/guide/usage" },
        { text: "构建与远程", link: "/guide/builds-and-remote" },
        { text: "添加任务", link: "/guide/task" },
        { text: "内置变量", link: "/guide/built-in-values" },
      ],
    },
    {
      text: "进阶",
      children: [
        { text: "概览", link: "/advanced/general" },
        { text: "爬虫", link: "/advanced/scraper" },
        { text: "解析器", link: "/advanced/resolver" },
        { text: "制作器", link: "/advanced/producter" },
      ],
    },
    {
      text: "使用模板",
      children: [
        { text: "开始", link: "/templates/start" },
        { text: "爬虫", link: "/templates/scraper" },
        { text: "解析器", link: "/templates/resolver" },
        { text: "制作器", link: "/templates/producer" },
      ],
    },
  ];
}

export default config;
