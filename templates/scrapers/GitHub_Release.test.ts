import assert from "node:assert/strict";
import test from "node:test";
import { Err, Ok } from "ts-results";
import scrape from "./GitHub_Release";
import resolve from "../resolvers/GitHub_Release";

const parameters = {
  taskName: "Motrix",
  url: "https://github.com/agalwood/Motrix",
};
const stable = {
  tag_name: "v1.8.19",
  prerelease: false,
  assets: [
    {
      name: "Motrix-1.8.19-win.zip",
      browser_download_url: "https://example.com/stable.zip",
    },
  ],
};

test("finds the stable release after a full page of prereleases and resolves the same version", async () => {
  const urls: string[] = [];
  const result = await scrape(parameters, async (url) => {
    urls.push(url);
    return new Ok(
      url.endsWith("page=1")
        ? Array.from({ length: 30 }, (_, i) => ({
            tag_name: `v2.0.0-beta.${i}`,
            prerelease: true,
          }))
        : [stable],
    );
  });
  const selected = result.unwrap();
  assert.equal(urls.length, 2);
  assert.match(urls[1], /per_page=30&page=2$/);
  assert.equal(selected.version, "v1.8.19");
  assert.equal(
    selected.downloadLink,
    "https://api.github.com/repos/agalwood/Motrix/releases/tags/v1.8.19",
  );
  const asset = await resolve(
    {
      downloadLink: selected.downloadLink,
      fileMatchRegex: "Motrix-[0-9.]+-win\\.zip",
    },
    async (url) => {
      assert.equal(url, selected.downloadLink);
      return new Ok(stable);
    },
  );
  assert.equal(asset.unwrap().directLink, "https://example.com/stable.zip");
});

test("preserves prerelease opt-in and tag filtering across pages", async () => {
  let calls = 0;
  const result = await scrape(
    {
      ...parameters,
      scraper_temp: {
        allow_pre_release: true,
        release_tag_regex: "^edge-stable/",
      },
    },
    async () => {
      calls++;
      return new Ok(
        calls === 1
          ? Array.from({ length: 30 }, () => ({
              tag_name: "chrome-stable/2",
              prerelease: false,
            }))
          : [{ tag_name: "edge-stable/1", prerelease: true }],
      );
    },
  );
  assert.equal(calls, 2);
  assert.equal(result.unwrap().version, "edge-stable/1");
  assert.match(result.unwrap().downloadLink, /tags\/edge-stable%2F1$/);
});

test("does not opt into prereleases when no stable release exists", async () => {
  const result = await scrape(
    parameters,
    async () => new Ok([{ tag_name: "v2-beta", prerelease: true }]),
  );
  assert.equal(result.err, true);
  assert.match(String(result.val), /Can't find matched GitHub release tag/);
});

test("reports a failed later page instead of returning a prerelease", async () => {
  let calls = 0;
  const result = await scrape(parameters, async () =>
    ++calls === 1
      ? new Ok(
          Array.from({ length: 30 }, () => ({
            tag_name: "v2-beta",
            prerelease: true,
          })),
        )
      : new Err("network failed"),
  );
  assert.equal(result.err, true);
  assert.match(String(result.val), /Can't fetch .*page=2$/);
});

test("keeps support for release lists supplied by other scrapers", async () => {
  const result = await resolve(
    {
      downloadLink: "https://api.github.com/repos/agalwood/Motrix/releases",
      fileMatchRegex: "win\\.zip$",
    },
    async () => new Ok([stable]),
  );
  assert.equal(result.unwrap().directLink, "https://example.com/stable.zip");
});
