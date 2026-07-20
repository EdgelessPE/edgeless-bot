import assert from "node:assert/strict";
import test from "node:test";
import { getInnoCommand } from "./inno";

test("uses innounp arguments on Windows", (): void => {
  assert.deepEqual(getInnoCommand("Windows", "setup.exe", "out"), {
    command: "innounp",
    args: ["-x", "-dout", "setup.exe", "-y"],
  });
});

test("uses innoextract arguments on Linux", (): void => {
  assert.deepEqual(getInnoCommand("Linux", "setup.exe", "out"), {
    command: "innoextract",
    args: ["--extract", "--output-dir", "out", "setup.exe"],
  });
});
