import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import test from "node:test";
import toml from "toml";
import scrape from "./Global_Page_Match";

const task = toml.parse(readFileSync("tasks/驱动总裁/config.toml", "utf8"));
const fullInstaller =
  "https://cdn-download.soft.360.cn/softmanager-installation/20260806/1900060398_093bbcfd8b6820306087610750c7504f.exe";
const downloader = `<a class="dl_add_btn" href="https://dl.360simg.com/software_installer_download/DrvCeooLinstaller_1029_74565.exe">安全下载</a>`;

async function scrapeFixture(downloadPage: string) {
  const server = createServer((req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(
      req.url === "/version"
        ? '<div class="version">版本：2.21.0.0</div>'
        : downloadPage,
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    return await scrape({
      taskName: task.task.name,
      url: `${base}/version`,
      scraper_temp: {
        ...task.scraper_temp,
        version_selector: ".version",
        download_page_url: `${base}/download`,
      },
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("DrvCeo selects the full installer rather than the safety downloader or cloud links", async () => {
  const result = await scrapeFixture(`
    ${downloader}
    <a class="dl_add_btn" href="${fullInstaller}">本地下载</a>
    <a class="dl_add_btn" href="https://pan.xunlei.com/s/example">迅雷网盘下载</a>
  `);
  assert.deepEqual(result.unwrap(), {
    version: "2.21.0.0",
    downloadLink: fullInstaller,
  });
});

test("DrvCeo fails closed when only the safety downloader remains", async () => {
  const result = await scrapeFixture(downloader);
  assert.equal(result.err, true);
  assert.equal(
    result.val,
    "Error:Given download link match regex matched nothing",
  );
});
