import assert from "node:assert/strict";
import test from "node:test";
import { selectWindowsInstaller } from "./scraper";

test("selectWindowsInstaller ignores visible gray release", (): void => {
  const page = `
    <script>
      window.__DATA__ = {
        win_link:"https:\\u002F\\u002Fdl.todesk.com\\u002Firrigation\\u002FToDesk_4.9.7.3.exe",
        win_link_gray:"https:\\u002F\\u002Fdl.todesk.com\\u002Firrigation\\u002FToDesk_4.9.8.0.exe"
      };
    </script>
    <a
      href="https://dl.todesk.com/irrigation/ToDesk_4.9.8.0.exe"
      style="display:;"
    >灰度版</a>
    <a
      href="https://dl.todesk.com/irrigation/ToDesk_4.9.7.3.exe"
      style="display:none;"
    >正式版</a>
  `;

  assert.equal(
    selectWindowsInstaller(page),
    "https://dl.todesk.com/irrigation/ToDesk_4.9.7.3.exe",
  );
});
