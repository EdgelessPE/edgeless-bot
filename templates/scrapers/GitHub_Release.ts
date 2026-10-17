import { Err, Ok, Result } from "ts-results";
import { robustGet } from "../../src/network";
import { ScraperParameters, ScraperReturned } from "../../src/class";
import { AxiosRequestConfig } from "axios";
import { coverSecret, log } from "../../src/utils";

interface Temp {
  allow_pre_release?: boolean;
  release_tag_regex?: string;
  release_asset_regex?: string;
}

function parseRepo(url: string): { owner: string; repo: string } {
  const splitRes = url.split("github.com/")[1].split("/");
  return {
    owner: splitRes[0],
    repo: splitRes[1],
  };
}

export default async function (
  p: ScraperParameters,
  get: typeof robustGet = robustGet,
): Promise<Result<ScraperReturned, string>> {
  const { url } = p,
    repoInfo = parseRepo(url);
  const temp: Temp | undefined = p.scraper_temp;

  const releasesUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/releases`;

  // 获取Json
  try {
    const token = process.env.GITHUB_TOKEN;
    if (token) log(`Info:Use GitHub Token ${coverSecret(token)}`);
    const cfg: AxiosRequestConfig | undefined =
      token != null
        ? {
            headers: {
              authorization: `Bearer ${token}`,
            },
          }
        : undefined;
    const tagRegex =
      temp?.release_tag_regex == undefined
        ? undefined
        : new RegExp(temp.release_tag_regex);
    const assetRegex =
      temp?.release_asset_regex == undefined
        ? undefined
        : new RegExp(temp.release_asset_regex);
    // 预发布版可能占满整页，继续翻页查找符合原有筛选条件的版本
    for (let page = 1; ; page++) {
      const pageUrl = `${releasesUrl}?per_page=30&page=${page}`;
      const response = await get(pageUrl, cfg);
      if (response.err) return new Err(`Error:Can't fetch ${pageUrl}`);
      const json = response.val;
      if (!Array.isArray(json)) {
        return new Err(`Error:GitHub api response is not an array : ${json}`);
      }
      for (const release of json) {
        if (
          release == null ||
          typeof release.tag_name !== "string" ||
          release.draft === true ||
          (!(temp?.allow_pre_release ?? false) &&
            release.prerelease === true) ||
          (tagRegex != undefined && !tagRegex.test(release.tag_name))
        ) {
          continue;
        }
        // 跳过尚未上传目标附件的版本，保持版本号与下载文件一致
        if (
          assetRegex != undefined &&
          (!Array.isArray(release.assets) ||
            !release.assets.some(
              (asset: { name?: unknown } | null) =>
                asset != null &&
                typeof asset.name === "string" &&
                assetRegex.test(asset.name),
            ))
        ) {
          continue;
        }
        // 固定到本次选中的发布版本，避免解析器重新从首页选择不同版本
        return new Ok({
          version: release.tag_name,
          downloadLink: `${releasesUrl}/tags/${encodeURIComponent(
            release.tag_name,
          )}`,
        });
      }
      if (json.length < 30) break;
    }
    return new Err(
      `Error:Can't find matched GitHub release tag${
        temp?.release_tag_regex == undefined
          ? ""
          : ` with ${temp.release_tag_regex}`
      }`,
    );
  } catch (e) {
    return new Err(
      `Error:Abnormal GitHub api response at task ${
        p.taskName
      } : ${JSON.stringify(e, null, 2)}`,
    );
  }
}
