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
    error.includes("Invalid ajax block : no url field matched") ||
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
    /\$\.ajax\(\s*{[\s\S]*?url\s*:\s*(['"][^'"]+['"]|[_\w]+)\s*,[\s\S]*?data\s*:\s*{([\s\S]*?)}[\s\S]*?}\s*\);/g,
  )) {
    const [, rawUrl, dataBlock] = matchRes;
    // /fn 内页通过 dom_ajaxs 选择 domain1 主接口，domain2 是 DNS 备用接口
    const url = normalizeValue(rawUrl === "dom_ajaxs" ? "domain1" : rawUrl);
    if (
      typeof url !== "string" ||
      (!url.includes("ajaxm.php") &&
        !url.includes("ajaxfile.php") &&
        !url.includes("filemoreajax.php"))
    ) {
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
    timeout: 10000,
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

function mergeLanzouCookies(
  current: string | undefined,
  setCookies: string[] = [],
  challengeCookie?: string,
): string {
  const cookies = new Map<string, string>();
  const add = (pair: string): void => {
    const separator = pair.indexOf("=");
    if (separator <= 0) return;
    cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1));
  };
  for (const pair of current?.split(";") ?? []) add(pair.trim());
  for (const cookie of setCookies) add(cookie.split(";")[0]);
  if (challengeCookie != undefined) add(challengeCookie);
  return Array.from(cookies, ([name, value]) => `${name}=${value}`).join("; ");
}

async function fetchProtectedPage(
  url: string,
  referer?: string,
  cookie?: string,
): Promise<Result<ProtectedPageResult, string>> {
  try {
    const cfg = buildAxiosConfig(referer);
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await axios.get(url, {
        ...cfg,
        headers: { ...cfg.headers, ...(cookie ? { Cookie: cookie } : {}) },
      });
      const html = String(response.data);
      const challengeCookie = extractEdgeOneCookie(html);
      cookie = mergeLanzouCookies(
        cookie,
        response.headers["set-cookie"],
        challengeCookie ?? undefined,
      );
      if (challengeCookie == null) return new Ok({ html, cookie });
    }
    return new Err(`Error:Lanzou page challenge was not resolved for '${url}'`);
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

    const cfg = buildAxiosConfig(referer);
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await axios.post(url, buildForm(), {
        ...cfg,
        headers: {
          ...cfg.headers,
          Origin: new URL(referer).origin,
          ...(cookie ? { Cookie: cookie } : {}),
        },
      });
      const challengeCookie =
        typeof response.data === "string"
          ? extractEdgeOneCookie(response.data)
          : null;
      cookie = mergeLanzouCookies(
        cookie,
        response.headers["set-cookie"],
        challengeCookie ?? undefined,
      );
      if (challengeCookie == null) {
        return new Ok(
          typeof response.data === "string"
            ? JSON.parse(response.data)
            : response.data,
        );
      }
    }
    return new Err(`Error:Lanzou API challenge was not resolved for '${url}'`);
  } catch (error) {
    return new Err(`Error:Failed to fetch Lanzou api '${url}' : ${error}`);
  }
}

async function fetchDirectLinkWithCookie(
  rawDownloadUrl: string,
  referer: string,
): Promise<Result<string, string>> {
  try {
    // 下载域名有独立的挑战 Cookie，不能沿用分享页域名的 Cookie
    let cookie = "down_ip=1";
    const cfg = buildAxiosConfig(referer);
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await axios.get(rawDownloadUrl, {
        ...cfg,
        maxRedirects: 0,
        maxContentLength: 131072,
        validateStatus: (status) =>
          status === 200 || status === 302 || status === 301,
        headers: { ...cfg.headers, Cookie: cookie },
      });
      const location = response.headers.location as string | undefined;
      if ((response.status === 302 || response.status === 301) && location) {
        const directLink = new URL(location, rawDownloadUrl);
        if (
          directLink.protocol !== "https:" &&
          directLink.protocol !== "http:"
        ) {
          return new Err("Error:Invalid Lanzou download redirect protocol");
        }
        return new Ok(directLink.toString());
      }
      const challengeCookie =
        typeof response.data === "string"
          ? extractEdgeOneCookie(response.data)
          : null;
      if (challengeCookie == null) break;
      cookie = mergeLanzouCookies(
        cookie,
        response.headers["set-cookie"],
        challengeCookie,
      );
    }
  } catch (error) {
    return new Err(
      `Error:Failed to resolve Lanzou download redirect : ${error}`,
    );
  }
  return new Err("Error:Lanzou download redirect was not resolved");
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
    new URL(apiUrl).origin === new URL(shareUrl).origin ? cookie : undefined,
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
      json.dom,
    );
    if (directLink.err) return directLink;
    return new Ok({
      directLink: directLink.val,
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

export {
  extractEdgeOneCookie,
  extractLanzouAjaxRequest,
  fetchProtectedPage,
  fetchProtectedJson,
  fetchDirectLinkWithCookie,
  mergeLanzouCookies,
  shouldUseProtectedFallback,
};
