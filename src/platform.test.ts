import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { normalizeTaskPath } from "./platform";

test("normalizes every Windows task path separator", (): void => {
  assert.equal(
    normalizeTaskPath("App\\Chrome-bin\\chrome.exe"),
    ["App", "Chrome-bin", "chrome.exe"].join(path.sep),
  );
});

test("keeps relative task paths relative", (): void => {
  assert.equal(
    path.isAbsolute(normalizeTaskPath("\\KeqingNiuza\\app.exe")),
    false,
  );
});

test("normalizes POSIX task paths on every host", (): void => {
  assert.equal(
    normalizeTaskPath("App/Chrome-bin/chrome.exe"),
    ["App", "Chrome-bin", "chrome.exe"].join(path.sep),
  );
});
