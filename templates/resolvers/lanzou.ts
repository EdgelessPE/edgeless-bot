import { ResolverParameters, ResolverReturned } from "../../src/class";
import { Ok, Err, Result } from "ts-results";
import { log } from "../../src/utils";
import { loadShareUrl } from "lanzou-api";
import axios, { AxiosRequestConfig } from "axios";
import { load } from "cheerio";
import vm from "node:vm";
import { getRandomIPHeader } from "lanzou-api/dist/utils";

interface LanzouAjaxRequest {
  url: string;
  data: Record<string, string | number | boolean | null>;
}

interface ProtectedPageResult {
  html: string;
  cookie?: string;
}

const EDGE_ONE_UNSBOX_MAP = [
  15, 35, 29, 24, 33, 16, 1, 38, 10, 9, 19, 31, 40, 27, 22, 23, 25, 13, 6, 11,
  39, 18, 20, 8, 14, 21, 32, 26, 2, 30, 7, 4, 17, 5, 3, 28, 34, 37, 12, 36,
];
const EDGE_ONE_XOR_KEY = "3000176000856006061501533003690027800375";

function shouldUseProtectedFallback(error: string): boolean {
  return (
    error.includes("Failed to find ajax block for files loading") ||
    error.includes("Failed to fetch url")
  );
}

function solveEdgeOneCookie(arg1: string): string {
  const reordered: string[] = [];
  for (let i = 0; i < arg1.length; i++) {
    const char = arg1[i];
    for (let j = 0; j < EDGE_ONE_UNSBOX_MAP.length; j++) {
      if (EDGE_ONE_UNSBOX_MAP[j] === i + 1) {
        reordered[j] = char;
      }
    }
  }
  const unsboxed = reordered.join("");

  let result = "";
  for (let i = 0; i < unsboxed.length && i < EDGE_ONE_XOR_KEY.length; i += 2) {
    const left = Number.parseInt(unsboxed.slice(i, i + 2), 16);
    const right = Number.parseInt(EDGE_ONE_XOR_KEY.slice(i, i + 2), 16);
    const xorValue = (left ^ right).toString(16).padStart(2, "0");
    result += xorValue;
  }
  return `acw_sc__v2=${result}`;
}

function extractEdgeOneCookie(html: string): string | null {
  const argMatchRes = html.match(/var\s+arg1\s*=\s*['"]([A-Fa-f0-9]+)['"]/);
  if (argMatchRes != null) {
    return solveEdgeOneCookie(argMatchRes[1]);
  }

  const matchRes = html.match(
    /<script[^>]*>([\s\S]*?document\.cookie[\s\S]*?)<\/script>/i,
  );
  if (matchRes == null) {
    return null;
  }

  let cookie = "";
  const location = {
    reload: (): void => undefined,
  };
  const document = {
    get cookie(): string {
      return cookie;
    },
    set cookie(value: string) {
      cookie = value;
    },
    location,
  };
  const sandbox = {
    document,
    location,
    window: {
      document,
      location,
    },
    atob,
    btoa,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout: (fn: unknown): number => {
      if (typeof fn === "function") {
        fn();
      }
      return 0;
    },
    clearTimeout: (): void => undefined,
  };

  try {
    vm.runInNewContext(matchRes[1], sandbox, { timeout: 1000 });
  } catch {
    return null;
  }

  if (cookie === "") {
    return null;
  }
  return cookie.split(";")[0];
}

function extractLanzouAjaxRequest(
  html: string,
  password?: string,
): LanzouAjaxRequest | null {
  const identifiersValue: Record<string, string> = {};
  for (const matchRes of html.matchAll(
    /(?:var\s+)?([_\w]+)\s*=\s*(['"][^'"]*['"]|\d+)\s*;?/g,
  )) {
    identifiersValue[matchRes[1]] = matchRes[2];
  }

  const normalizeValue = (
    rawValue: string,
  ): string | number | boolean | null => {
    const value = rawValue.trim();
    if (value === "pwd") {
      return password ?? "";
    }
    if (value === "kdns") {
      return 1;
    }
    if (/^\d+$/.test(value)) {
      return Number(value);
    }
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      return value.slice(1, -1);
    }
    const mapped = identifiersValue[value];
    if (mapped == null) {
      return null;
    }
    return normalizeValue(mapped);
  };

  for (const matchRes of html.matchAll(
    /\$\.ajax\(\s*{[\s\S]*?url\s*:\s*['"]([^'"]+)['"][\s\S]*?data\s*:\s*{([\s\S]*?)}[\s\S]*?}\s*\);/g,
  )) {
    const [, url, dataBlock] = matchRes;
    if (!url.includes("ajaxm.php") && !url.includes("filemoreajax.php")) {
      continue;
    }

    const data: LanzouAjaxRequest["data"] = {};
    for (const node of dataBlock.split(",")) {
      const line = node.trim();
      if (line === "") {
        continue;
      }
      const fieldMatchRes = line.match(/['"]?([_\w]+)['"]?\s*:\s*([_\w'"]+)/);
      if (fieldMatchRes == null) {
        continue;
      }
      const normalized = normalizeValue(fieldMatchRes[2]);
      if (normalized != null) {
        data[fieldMatchRes[1]] = normalized;
      }
    }
    return { url, data };
  }
  return null;
}

function buildAxiosConfig(
  referer?: string,
  cookie?: string,
): AxiosRequestConfig {
  return {
    proxy: false,
    headers: {
      ...getRandomIPHeader(),
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      "Accept-Language": "zh-CN,zh;q=0.9",
      ...(referer == null ? {} : { Referer: referer }),
      ...(cookie == null ? {} : { Cookie: cookie }),
    },
  };
}

async function fetchProtectedPage(
  url: string,
  referer?: string,
  cookie?: string,
): Promise<Result<ProtectedPageResult, string>> {
  try {
    const firstRes = await axios.get(url, buildAxiosConfig(referer, cookie));
    const firstHtml =
      typeof firstRes.data === "string" ? firstRes.data : `${firstRes.data}`;
    const challengeCookie = extractEdgeOneCookie(firstHtml);
    if (challengeCookie == null) {
      return new Ok({
        html: firstHtml,
        cookie,
      });
    }

    const finalCookie =
      cookie == null ? challengeCookie : `${cookie}; ${challengeCookie}`;
    const secondRes = await axios.get(
      url,
      buildAxiosConfig(referer, finalCookie),
    );
    return new Ok({
      html:
        typeof secondRes.data === "string"
          ? secondRes.data
          : `${secondRes.data}`,
      cookie: finalCookie,
    });
  } catch (error) {
    return new Err(`Error:Failed to fetch Lanzou page '${url}' : ${error}`);
  }
}

async function fetchProtectedJson(
  url: string,
  payload: Record<string, string | number | boolean | null>,
  referer: string,
  cookie?: string,
): Promise<Result<any, string>> {
  try {
    const buildForm = (): FormData => {
      const form = new FormData();
      for (const [key, value] of Object.entries(payload)) {
        form.append(key, value?.toString() ?? "");
      }
      return form;
    };

    const firstRes = await axios.post(url, buildForm(), {
      proxy: false,
      headers: {
        ...getRandomIPHeader(),
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9",
        Referer: referer,
        Origin: new URL(referer).origin,
        ...(cookie == null ? {} : { Cookie: cookie }),
      },
    });
    if (typeof firstRes.data !== "string") {
      return new Ok(firstRes.data);
    }

    const challengeCookie = extractEdgeOneCookie(firstRes.data);
    if (challengeCookie == null) {
      return new Ok(JSON.parse(firstRes.data));
    }

    const finalCookie =
      cookie == null ? challengeCookie : `${cookie}; ${challengeCookie}`;
    const secondRes = await axios.post(url, buildForm(), {
      proxy: false,
      headers: {
        ...getRandomIPHeader(),
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9",
        Referer: referer,
        Origin: new URL(referer).origin,
        Cookie: finalCookie,
      },
    });
    return new Ok(
      typeof secondRes.data === "string"
        ? JSON.parse(secondRes.data)
        : secondRes.data,
    );
  } catch (error) {
    return new Err(`Error:Failed to fetch Lanzou api '${url}' : ${error}`);
  }
}

async function fetchDirectLinkWithCookie(
  rawDownloadUrl: string,
  referer: string,
  cookie?: string,
): Promise<string> {
  try {
    const response = await axios.get(rawDownloadUrl, {
      proxy: false,
      maxRedirects: 0,
      validateStatus: (status) => status === 302 || status === 301,
      headers: {
        ...getRandomIPHeader(),
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9",
        Referer: referer,
        ...(cookie == null ? {} : { Cookie: cookie }),
      },
    });
    const location = response.headers.location as string | undefined;
    if (location != null) {
      return location;
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.headers.location) {
      return error.response.headers.location as string;
    }
  }
  return rawDownloadUrl;
}

async function resolveLanzouFileRequest(
  shareUrl: string,
  request: LanzouAjaxRequest,
  cookie?: string,
): Promise<Result<ResolverReturned, string>> {
  const apiUrl = new URL(request.url, shareUrl).toString();
  const jsonRes = await fetchProtectedJson(
    apiUrl,
    request.data,
    shareUrl,
    cookie,
  );
  if (jsonRes.err) {
    return new Err(jsonRes.val);
  }

  const json = jsonRes.val;
  const info = json.inf || json.info || null;
  if (json.zt !== 1) {
    return new Err(
      `Error: Lanzou api returned error status '${json.zt}' : '${info}'`,
    );
  }

  if (!json.text && json.dom && json.url) {
    const rawDownloadUrl = `${json.dom}/file/${json.url}`;
    const directLink = await fetchDirectLinkWithCookie(
      rawDownloadUrl,
      shareUrl,
      cookie,
    );
    return new Ok({
      directLink,
    });
  }

  if (json.text) {
    return new Err(
      "Error:Matched folder '${name}', not file; Cd param hasn't been supported yet",
    );
  }

  return new Err(`Error: Failed to judge share type for '${shareUrl}'`);
}

async function resolveProtectedLanzouFolder(
  shareUrl: string,
  request: LanzouAjaxRequest,
  fileMatchRegex: string,
  cookie?: string,
): Promise<Result<ResolverReturned, string>> {
  const apiUrl = new URL(request.url, shareUrl).toString();
  const jsonRes = await fetchProtectedJson(
    apiUrl,
    request.data,
    shareUrl,
    cookie,
  );
  if (jsonRes.err) {
    return new Err(jsonRes.val);
  }

  const json = jsonRes.val;
  const info = json.inf || json.info || null;
  if (json.zt !== 1) {
    return new Err(
      `Error: Lanzou api returned error status '${json.zt}' : '${info}'`,
    );
  }
  if (!Array.isArray(json.text)) {
    return new Err(`Error: Failed to parse Lanzou folder list '${shareUrl}'`);
  }

  log(`Info:Matching file with regex '${fileMatchRegex}' in protected folder`);
  const regex = new RegExp(fileMatchRegex);
  for (const node of json.text) {
    const name = String(node.name_all ?? "");
    const id = String(node.id ?? "");
    if (!regex.test(name) || id === "" || id === "-1") {
      continue;
    }

    log(`Info:Matched file '${name}'`);
    const fileUrl = new URL(`/${id}`, shareUrl).toString();
    const res = await loadShareUrl(fileUrl);
    if (res.isErr()) {
      if (shouldUseProtectedFallback(res.unwrapErr())) {
        return resolveProtectedLanzouFile(fileUrl);
      }
      return new Err(res.unwrapErr());
    }
    const data = res.unwrap();
    if (data.type === "folder") {
      return new Err(
        `Error:Matched folder '${name}', not file; Cd param hasn't been supported yet`,
      );
    }
    return new Ok({
      directLink: data.downloadUrl,
    });
  }

  return new Err("Error:Can't match file");
}

async function resolveProtectedLanzouFile(
  shareUrl: string,
  password?: string,
): Promise<Result<ResolverReturned, string>> {
  const pageRes = await fetchProtectedPage(shareUrl);
  if (pageRes.err) {
    return new Err(pageRes.val);
  }

  let html = pageRes.val.html;
  let cookie = pageRes.val.cookie;
  const $ = load(html);
  const iframeSrc = $("iframe").first().attr("src");
  if (iframeSrc != null) {
    const iframeUrl = new URL(iframeSrc, shareUrl).toString();
    const iframeRes = await fetchProtectedPage(
      iframeUrl,
      shareUrl,
      pageRes.val.cookie,
    );
    if (iframeRes.err) {
      return new Err(iframeRes.val);
    }
    html = iframeRes.val.html;
    cookie = iframeRes.val.cookie ?? cookie;
  }

  const request = extractLanzouAjaxRequest(html, password);
  if (request == null) {
    return new Err("Error: Failed to find ajax block for files loading");
  }

  return resolveLanzouFileRequest(shareUrl, request, cookie);
}

async function resolveProtectedLanzouShare(
  shareUrl: string,
  fileMatchRegex: string,
  password?: string,
): Promise<Result<ResolverReturned, string>> {
  const pageRes = await fetchProtectedPage(shareUrl);
  if (pageRes.err) {
    return new Err(pageRes.val);
  }

  const request = extractLanzouAjaxRequest(pageRes.val.html, password);
  if (request == null) {
    return new Err("Error: Failed to find ajax block for files loading");
  }

  if (request.url.includes("filemoreajax.php")) {
    return resolveProtectedLanzouFolder(
      shareUrl,
      request,
      fileMatchRegex,
      pageRes.val.cookie,
    );
  }

  return resolveLanzouFileRequest(shareUrl, request, pageRes.val.cookie);
}

export default async function (
  p: ResolverParameters,
): Promise<Result<ResolverReturned, string>> {
  const { downloadLink, password, cd, fileMatchRegex } = p;
  log(`Info:Resolving download link: ${downloadLink}`);
  if (cd?.length) {
    log(
      `Warning:Resolver template 'Lanzou' doesn't support cd currently, ignoring cd array : '${JSON.stringify(
        cd,
      )}'`,
    );
  }

  const res = await loadShareUrl(downloadLink, password);
  if (res.isErr()) {
    if (shouldUseProtectedFallback(res.unwrapErr())) {
      return resolveProtectedLanzouShare(
        downloadLink,
        fileMatchRegex,
        password,
      );
    }
    return new Err(res.unwrapErr());
  }
  const data = res.unwrap();

  if (data.type === "file") {
    log(
      `Info:Parsed file : '${data.name}', download link : '${data.downloadUrl}'`,
    );
    return new Ok({
      directLink: data.downloadUrl,
    });
  } else {
    log(
      `Info:Matching file with regex '${fileMatchRegex}' in the share folder`,
    );
    const { nodes } = data;
    const regex = new RegExp(fileMatchRegex);
    for (const { name_all, shareUrl } of nodes) {
      if (regex.test(name_all)) {
        log(`Info:Matched file '${name_all}'`);
        const r = await loadShareUrl(shareUrl);
        if (r.isErr()) {
          if (shouldUseProtectedFallback(r.unwrapErr())) {
            return resolveProtectedLanzouFile(shareUrl, password);
          }
          return new Err(r.unwrapErr());
        } else {
          const d = r.unwrap();
          if (d.type === "folder") {
            return new Err(
              "Error:Matched folder '${name}', not file; Cd param hasn't been supported yet",
            );
          }
          return new Ok({
            directLink: d.downloadUrl,
          });
        }
      }
    }
    return new Err("Error:Can't match file");
  }
}

export { extractEdgeOneCookie, extractLanzouAjaxRequest };
