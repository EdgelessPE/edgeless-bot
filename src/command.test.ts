import assert from "node:assert/strict";
import test from "node:test";
import { getCurlArguments } from "./aria2c";
import { getCompressArguments } from "./p7zip";

test("keeps curl paths and URLs in separate arguments", (): void => {
  assert.deepEqual(
    getCurlArguments(
      "https://example.com/file.exe?a=1&b=2",
      "/tmp/中文 path/file.exe",
      { referer: "https://example.com/page?a=1&b=2" },
    ),
    [
      "-k",
      "-L",
      "-A",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
      "-o",
      "/tmp/中文 path/file.exe",
      "-e",
      "https://example.com/page?a=1&b=2",
      "https://example.com/file.exe?a=1&b=2",
    ],
  );
});

test("keeps archive entries in separate arguments", (): void => {
  assert.deepEqual(
    getCompressArguments("/tmp/output file.7z", 5, ["App Files", "中文.wcs"]),
    ["a", "-mx5", "/tmp/output file.7z", "--", "App Files", "中文.wcs"],
  );
});
