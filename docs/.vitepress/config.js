/**
 * @type {import('vitepress').UserConfig}
 */
const config = {
  base: "/bot/",
  title: "Edgeless Bot",
  description: "Expandable upstream watchdog for like application stores",
  outDir:"docs-dist",
  head: [
    ['link', { rel: 'icon', href: 'https://pineapple.edgeless.top/picbed/wiki/bot/logo.ico' }]
  ],
  themeConfig:{
    repo: 'EdgelessPE/edgeless-bot',
    docsRepo:'https://github.com/EdgelessPE/edgeless-bot',
    docsBranch: 'next',
    editLinks: true,
    editLinkText: '在 GitHub 上编辑此页',
    docsDir: 'docs',
    lastUpdated: '最近更新于',
    logo: "https://pineapple.edgeless.top/picbed/wiki/bot/logo.ico",
    nav: [
      { text: "首页", link: "https://home.edgeless.top" },
      { text: "Hub", link: "https://down.edgeless.top" },
    ],
    sidebar: {
        '/': getGuideSidebar()
      }
  }
};

function getGuideSidebar() {
    return [
      {
        text: '基础',
        children: [
          { text: '介绍', link: '/guide/whats' },
          { text: '安装', link: '/guide/usage' },
          { text: '任务', link: '/guide/task' },
          { text: '内置变量', link: '/guide/built-in-values' },
        ]
      },
      {
        text: '进阶',
        children: [
          { text: '爬虫', link: '/advanced/scraper' },
          { text: '解析器', link: '/advanced/resolver' },
          { text: '制作器', link: '/advanced/producter' },
        ]
      }
    ]
  }

export default config;
