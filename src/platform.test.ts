import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { getRequiredCommands, normalizeTaskPath } from "./platform";

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

test("requires innoextract on every non-Windows platform", (): void => {
  assert.equal(
    getRequiredCommands("Windows", false).includes("innoextract"),
    false,
  );
  assert.equal(
    getRequiredCommands("Linux", false).includes("innoextract"),
    true,
  );
  assert.equal(
    getRequiredCommands("MacOS", false).includes("innoextract"),
    true,
  );
  assert.equal(
    getRequiredCommands("Other", false).includes("innoextract"),
    true,
  );
});

test("requires cloud139 only when remote storage is enabled", (): void => {
  assert.equal(getRequiredCommands("Linux", false).includes("cloud139"), false);
  assert.equal(getRequiredCommands("Linux", true).includes("cloud139"), true);
});

test("requires the bundled C PE resource reader on Linux", (): void => {
  assert.equal(
    getRequiredCommands("Windows", false).includes("peversion"),
    false,
  );
  assert.equal(getRequiredCommands("Linux", false).includes("peversion"), true);
  assert.equal(
    getRequiredCommands("MacOS", false).includes("peversion"),
    false,
  );
});
