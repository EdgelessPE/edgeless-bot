import assert from "node:assert/strict";
import test from "node:test";
import axios, { AxiosRequestConfig } from "axios";
import {
  extractEdgeOneCookie,
  extractLanzouAjaxRequest,
  fetchDirectLinkWithCookie,
  fetchProtectedJson,
  fetchProtectedPage,
  mergeLanzouCookies,
  shouldUseProtectedFallback,
} from "./lanzou";

const challenge =
  "<html><script>var arg1='16F97D07BBFD655E161EDAC748A6CD28BDA18C9D';</script></html>";

test("parses the new fn page using its primary API variable and actual form values", () => {
  const html = `
    var wp_sign = 'fresh-sign';
    var ajaxdata = 'dYdY';
    var kdns = 1;
    var domain1 = 'https://apifile.woozooo.com/ajaxfile.php?file=322925409';
    var domain2 = 'https://apifile.lanzouw.com/ajaxfile.php?file=322925409';
    if (typeof(killdnsweb)=='undefined') { dom_ajaxs = domain2; } else { dom_ajaxs = domain1; }
    $.ajax({ url: dom_ajaxs, data: { action:'downprocess', websignkey:ajaxdata, signs:ajaxdata, sign:wp_sign, websign:'', kd:kdns, ves:1 } });
  `;
  assert.deepEqual(extractLanzouAjaxRequest(html), {
    url: "https://apifile.woozooo.com/ajaxfile.php?file=322925409",
    data: {
      action: "downprocess",
      websignkey: "dYdY",
      signs: "dYdY",
      sign: "fresh-sign",
      websign: "",
      kd: 1,
      ves: 1,
    },
  });
});

test("ignores unrelated AJAX calls and refuses an unknown dynamic API URL", () => {
  const html = `
    $.ajax({ url: 'https://apifile.lanzouw.com/search/s.php?file=1', data: { q:'ignored' } });
    $.ajax({ url: '/filemoreajax.php?file=1', data: { lx:2, pg:1 } });
  `;
  assert.equal(extractLanzouAjaxRequest(html)?.url, "/filemoreajax.php?file=1");
  assert.equal(
    extractLanzouAjaxRequest(
      "$.ajax({url: unknown, data: {action:'downprocess'}});",
    ),
    null,
  );
});

test("uses the protected resolver for unsupported AJAX syntax without hiding application errors", () => {
  assert.equal(
    shouldUseProtectedFallback(
      "Error: Fatal: Invalid ajax block : no url field matched",
    ),
    true,
  );
  assert.equal(shouldUseProtectedFallback("Error: password incorrect"), false);
  assert.equal(shouldUseProtectedFallback("Error: file cancelled"), false);
});

test("replaces stale challenge cookies while preserving server cookies and equals in values", () => {
  assert.equal(
    mergeLanzouCookies(
      "acw_sc__v2=old; down_ip=1",
      ["acw_tc=session==; Path=/; HttpOnly", "cdn_sec_tc=edge; Path=/"],
      "acw_sc__v2=new",
    ),
    "acw_sc__v2=new; down_ip=1; acw_tc=session==; cdn_sec_tc=edge",
  );
});

test("solves a page challenge with a fresh cookie and preserves response session cookies", async (t) => {
  const requests: AxiosRequestConfig[] = [];
  t.mock.method(axios, "get", async (_url: string, cfg: AxiosRequestConfig) => {
    requests.push(cfg);
    return requests.length === 1
      ? {
          data: challenge,
          headers: {
            "set-cookie": ["acw_tc=session; Path=/", "cdn_sec_tc=edge; Path=/"],
          },
        }
      : {
          data: "<iframe src='/fn?fresh'></iframe>",
          headers: { "set-cookie": ["codelen=1; Path=/"] },
        };
  });
  const result = await fetchProtectedPage(
    "https://www.lanzouo.com/file",
    undefined,
    "acw_sc__v2=expired",
  );
  assert.equal(result.ok, true);
  const cookie = String(requests[1].headers?.Cookie);
  assert.equal(cookie.match(/acw_sc__v2=/g)?.length, 1);
  assert.ok(cookie.includes(extractEdgeOneCookie(challenge)!));
  assert.match(cookie, /acw_tc=session/);
  assert.match(cookie, /cdn_sec_tc=edge/);
  assert.match(result.unwrap().cookie!, /codelen=1/);
  assert.equal(
    requests[0].headers?.["X-FORWARDED-FOR"],
    requests[1].headers?.["X-FORWARDED-FOR"],
  );
});

test("reports an unresolved page challenge after bounded retries", async (t) => {
  let calls = 0;
  t.mock.method(axios, "get", async () => {
    calls++;
    return { data: challenge, headers: {} };
  });
  const result = await fetchProtectedPage("https://www.lanzouo.com/file");
  assert.equal(calls, 3);
  assert.equal(result.err, true);
  assert.match(String(result.val), /challenge was not resolved/);
});

test("rebuilds a POST form and updates cookies when the API returns a challenge", async (t) => {
  const forms: FormData[] = [];
  const cookies: string[] = [];
  t.mock.method(
    axios,
    "post",
    async (_url: string, form: FormData, cfg: AxiosRequestConfig) => {
      forms.push(form);
      cookies.push(String(cfg.headers?.Cookie ?? ""));
      return forms.length === 1
        ? { data: challenge, headers: { "set-cookie": ["acw_tc=api; Path=/"] } }
        : { data: { zt: 1, url: "download" }, headers: {} };
    },
  );
  const result = await fetchProtectedJson(
    "https://apifile.woozooo.com/ajaxfile.php",
    { action: "downprocess", sign: "signed" },
    "https://www.lanzouo.com/file",
  );
  assert.equal(result.unwrap().zt, 1);
  assert.notEqual(forms[0], forms[1]);
  assert.equal(forms[1].get("sign"), "signed");
  assert.match(cookies[1], /acw_tc=api/);
  assert.ok(cookies[1].includes(extractEdgeOneCookie(challenge)!));
});

test("solves the independent download-domain challenge before returning the CDN redirect", async (t) => {
  const requests: AxiosRequestConfig[] = [];
  t.mock.method(axios, "get", async (_url: string, cfg: AxiosRequestConfig) => {
    requests.push(cfg);
    return requests.length === 1
      ? {
          status: 200,
          data: challenge,
          headers: { "set-cookie": ["acw_tc=download; Path=/"] },
        }
      : {
          status: 302,
          data: "",
          headers: { location: "https://zip2.webgetstore.com/file.7z" },
        };
  });
  const result = await fetchDirectLinkWithCookie(
    "https://developer4.lanrar.com/file/token",
    "https://developer4.lanrar.com",
  );
  assert.equal(result.unwrap(), "https://zip2.webgetstore.com/file.7z");
  assert.equal(requests[0].headers?.Cookie, "down_ip=1");
  assert.match(String(requests[1].headers?.Cookie), /down_ip=1/);
  assert.match(String(requests[1].headers?.Cookie), /acw_tc=download/);
});

test("never returns the unresolved HTML download page as a successful direct link", async (t) => {
  let calls = 0;
  t.mock.method(axios, "get", async () => {
    calls++;
    return { status: 200, data: challenge, headers: {} };
  });
  const result = await fetchDirectLinkWithCookie(
    "https://developer4.lanrar.com/file/token",
    "https://developer4.lanrar.com",
  );
  assert.equal(result.err, true);
  assert.equal(calls, 3);
  assert.match(String(result.val), /redirect was not resolved/);
});

test("extractLanzouAjaxRequest supports ajaxfile download pages", (): void => {
  const html = `
    <script>
      var wp_sign = 'example-sign';
      var ajaxdata = 'DgMi';
      var kdns = 1;
      $.ajax({
        type: 'post',
        url: '/ajaxfile.php?file=314301503',
        data: {
          'action': 'downprocess',
          'websignkey': ajaxdata,
          'signs': ajaxdata,
          'sign': wp_sign,
          'websign': '',
          'kd': kdns,
          'ves': 1
        },
        dataType: 'json'
      });
    </script>
  `;

  assert.deepEqual(extractLanzouAjaxRequest(html), {
    url: "/ajaxfile.php?file=314301503",
    data: {
      action: "downprocess",
      websignkey: "DgMi",
      signs: "DgMi",
      sign: "example-sign",
      websign: "",
      kd: 1,
      ves: 1,
    },
  });
});
