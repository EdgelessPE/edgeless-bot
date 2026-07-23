import assert from "node:assert/strict";
import test from "node:test";
import { selectWindowsInstaller } from "./scraper";

test("selectWindowsInstaller ignores hidden gray release", (): void => {
  const page = `
    <a
      href="https://dl.todesk.com/irrigation/ToDesk_4.9.8.0.exe"
      style="display:none;"
    >灰度版</a>
    <a
      href="https://dl.todesk.com/irrigation/ToDesk_4.9.7.3.exe"
      style="display:;"
    >正式版</a>
  `;

  assert.equal(
    selectWindowsInstaller(page),
    "https://dl.todesk.com/irrigation/ToDesk_4.9.7.3.exe",
  );
});
