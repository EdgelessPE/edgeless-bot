import { ResolverParameters, ResolverReturned } from "../../src/class";
import { Err, Ok, Result } from "ts-results";
import { robustGet } from "../../src/network";
import { coverSecret, log } from "../../src/utils";
import { AxiosRequestConfig } from "axios";

interface Temp {
  allow_pre_release?: boolean;
}

function selectGitHubReleaseAsset(
  releases: any[],
  fileMatchRegex: string,
  allowPreRelease: boolean,
): Result<string, string> {
  const regex = new RegExp(fileMatchRegex);

  for (const release of releases) {
    if (release == null) {
      continue;
    }
    if (!allowPreRelease && release.prerelease) {
      continue;
    }

    const assets: any[] = Array.isArray(release.assets) ? release.assets : [];
    let result = "";

    for (const node of assets) {
      if (node == null || typeof node.name !== "string") {
        continue;
      }
      if (node.name.match(regex) != null) {
        if (result === "") {
          result = node.browser_download_url;
          log(`Info:Matched ${node.name}`);
        } else {
          log(
            `Warning:Ambiguous fileMatchRegex,matched more than one file : ${node.name}`,
          );
        }
      }
    }

    if (result !== "") {
      return new Ok(result);
    }
  }

  return new Err("Error:Can't match any file with given fileMatchRegex");
}

export default async function (
  p: ResolverParameters,
): Promise<Result<ResolverReturned, string>> {
  const { downloadLink, fileMatchRegex } = p;
  const temp: Temp | undefined = p.scraper_temp;

  // 获取Json
  let json: any;
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
    json = (await robustGet(downloadLink, cfg)).unwrap();
  } catch (e) {
    console.log(JSON.stringify(e));
    return new Err(`Error:Can't fetch ${downloadLink}`);
  }
  const result = selectGitHubReleaseAsset(
    Array.isArray(json) ? json : [],
    fileMatchRegex,
    temp?.allow_pre_release ?? false,
  );
  if (result.err) {
    return result;
  }

  return new Ok({
    directLink: result.val,
  });
}

export { selectGitHubReleaseAsset };
