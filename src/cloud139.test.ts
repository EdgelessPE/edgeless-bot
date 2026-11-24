import assert from "node:assert/strict";
import cp from "node:child_process";
import fs from "node:fs";
import test from "node:test";
import { uploadToRemote } from "./cloud139";
import { config } from "./config";
import { LIGHT_TIMEOUT } from "./const";
import * as platform from "./platform";
import { Ok } from "ts-results";

test("allows 30 minutes per upload without extending metadata timeouts", (t) => {
  const remoteEnabled = config.REMOTE_ENABLE;
  config.REMOTE_ENABLE = true;
  const calls: { command: string; timeout: number; killSignal: string }[] = [];
  t.mock.method(platform, "where", () => new Ok("cloud139"));
  t.mock.method(cp, "execFileSync", (...parameters: unknown[]) => {
    const args = parameters[1] as string[];
    const options = parameters[2] as { timeout: number; killSignal: string };
    calls.push({ command: args[0], ...options });
    if (args[0] === "ls") {
      fs.writeFileSync(
        args[3],
        JSON.stringify({ items: [{ name: "test.7z" }] }),
      );
    }
    return Buffer.from("");
  });
  try {
    // 两个文件分别获得完整上传限时，上传前的查询和删除仍使用短超时。
    assert.equal(uploadToRemote("test.7z", "test"), true);
    assert.equal(uploadToRemote("test.7z", "test"), true);
    assert.deepEqual(
      calls,
      ["ls", "rm", "upload", "ls", "rm", "upload"].map((command) => ({
        command,
        timeout: command === "upload" ? 30 * 60_000 : LIGHT_TIMEOUT,
        killSignal: "SIGKILL",
      })),
    );
    assert.equal(LIGHT_TIMEOUT, 30_000);
  } finally {
    config.REMOTE_ENABLE = remoteEnabled;
    t.mock.restoreAll();
  }
});
