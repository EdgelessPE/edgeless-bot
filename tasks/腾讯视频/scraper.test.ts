import assert from "node:assert/strict";
import test from "node:test";
import { parseTencentVideoPayload } from "./scraper";

test("parseTencentVideoPayload selects the visible Windows x64 release", (): void => {
  assert.deepEqual(
    parseTencentVideoPayload({
      code: 200,
      data: [
        {
          app: "Windows",
          isShow: true,
          version: "11.185.3274.0",
          downloadLink:
            "https://dldir1.qq.com/qqtv/TencentVideo11.185.3274.0.exe",
          downloadLinkFor64:
            "https://dldir1.qq.com/qqtv/TencentVideo11.185.3274.0_x64.exe?support_redirect=1",
        },
      ],
    }),
    {
      version: "11.185.3274.0",
      downloadLink:
        "https://dldir1.qq.com/qqtv/TencentVideo11.185.3274.0_x64.exe?support_redirect=1",
    },
  );
});

test("parseTencentVideoPayload rejects mismatched versions", (): void => {
  assert.throws(
    () =>
      parseTencentVideoPayload({
        code: 200,
        data: [
          {
            app: "Windows",
            isShow: true,
            version: "11.185.3274.0",
            downloadLinkFor64:
              "https://dldir1.qq.com/qqtv/TencentVideo11.184.3265.0_x64.exe",
          },
        ],
      }),
    /version mismatch/,
  );
});
