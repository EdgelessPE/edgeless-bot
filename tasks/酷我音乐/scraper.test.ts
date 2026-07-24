import assert from "node:assert/strict";
import test from "node:test";
import { Err, Ok, Result } from "ts-results";
import { fetchKuwoDownloadUrl } from "./scraper";

test("uses the preferred Kuwo channel without contacting fallbacks", async (): Promise<void> => {
  const requestedUrls: string[] = [];
  const result = await fetchKuwoDownloadUrl(
    async (url: string): Promise<Result<unknown, string>> => {
      requestedUrls.push(url);
      return new Ok({
        data: { url: "https://pkgdown.kuwo.cn/preferred.exe" },
      });
    },
  );

  assert.equal(result.unwrap(), "https://pkgdown.kuwo.cn/preferred.exe");
  assert.equal(requestedUrls.length, 1);
  assert.match(requestedUrls[0], /pack=web_1$/);
});

test("falls back when the preferred Kuwo channel request fails", async (): Promise<void> => {
  const requestedUrls: string[] = [];
  const result = await fetchKuwoDownloadUrl(
    async (url: string): Promise<Result<unknown, string>> => {
      requestedUrls.push(url);
      if (url.endsWith("web_1")) {
        return new Err("request failed");
      }
      return new Ok({
        data: { url: "https://pkgdown.kuwo.cn/fallback.exe" },
      });
    },
  );

  assert.equal(result.unwrap(), "https://pkgdown.kuwo.cn/fallback.exe");
  assert.deepEqual(
    requestedUrls.map((url) => url.split("=").pop()),
    ["web_1", "web_2"],
  );
});

test("falls back when a Kuwo channel returns an invalid payload", async (): Promise<void> => {
  const requestedUrls: string[] = [];
  const result = await fetchKuwoDownloadUrl(
    async (url: string): Promise<Result<unknown, string>> => {
      requestedUrls.push(url);
      if (url.endsWith("web_1")) {
        return new Ok({ data: {} });
      }
      return new Ok({
        data: { url: "https://pkgdown.kuwo.cn/fallback.exe" },
      });
    },
  );

  assert.equal(result.unwrap(), "https://pkgdown.kuwo.cn/fallback.exe");
  assert.deepEqual(
    requestedUrls.map((url) => url.split("=").pop()),
    ["web_1", "web_2"],
  );
});

test("returns an error after every Kuwo channel fails", async (): Promise<void> => {
  const requestedUrls: string[] = [];
  const result = await fetchKuwoDownloadUrl(
    async (url: string): Promise<Result<unknown, string>> => {
      requestedUrls.push(url);
      return new Err("request failed");
    },
  );

  assert.equal(result.err, true);
  assert.deepEqual(
    requestedUrls.map((url) => url.split("=").pop()),
    ["web_1", "web_2", "web_6"],
  );
});
