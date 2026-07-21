import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { getCurlArguments } from "./aria2c";
import {
  commitExtractedDirectory,
  getCompressArguments,
  normalizeExtractedPaths,
  release,
} from "./p7zip";

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

test("normalizes Windows separators preserved in extracted file names", (): void => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "edgeless-unzip-"));
  try {
    fs.writeFileSync(path.join(root, "win-vind\\win-vind.exe"), "test");
    normalizeExtractedPaths(root);
    assert.equal(
      fs.existsSync(path.join(root, "win-vind", "win-vind.exe")),
      true,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("normalizes nested directories with preserved Windows separators", (): void => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "edgeless-unzip-"));
  try {
    const preservedDirectory = path.join(root, "outer\\inner");
    fs.mkdirSync(preservedDirectory);
    fs.writeFileSync(path.join(preservedDirectory, "nested\\file.exe"), "test");
    normalizeExtractedPaths(root);
    assert.equal(
      fs.existsSync(path.join(root, "outer", "inner", "nested", "file.exe")),
      true,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("rejects preserved Windows paths escaping the extraction root", (): void => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "edgeless-unzip-"));
  const escaped = path.join(
    path.dirname(root),
    `escaped-${path.basename(root)}`,
  );
  try {
    fs.writeFileSync(path.join(root, `..\\${path.basename(escaped)}`), "test");
    assert.throws(() => normalizeExtractedPaths(root), /Unsafe extracted path/);
    assert.equal(fs.existsSync(escaped), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(escaped, { recursive: true, force: true });
  }
});

test("keeps existing output when archive extraction fails", async (): Promise<void> => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "edgeless-release-"));
  try {
    fs.writeFileSync(path.join(root, "broken.zip"), "not an archive");
    fs.mkdirSync(path.join(root, "ready"));
    fs.writeFileSync(path.join(root, "ready", "existing.txt"), "keep");
    assert.equal(await release("broken.zip", "ready", false, root), false);
    assert.equal(
      fs.readFileSync(path.join(root, "ready", "existing.txt"), "utf8"),
      "keep",
    );
    assert.equal(
      fs.readdirSync(root).some((name) => name.startsWith(".edgeless-")),
      false,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("atomically merges successful extraction with existing output", (): void => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "edgeless-release-"));
  try {
    const payload = path.join(root, "payload");
    fs.mkdirSync(payload);
    fs.writeFileSync(path.join(payload, "new.txt"), "new");
    fs.mkdirSync(path.join(root, "ready"));
    fs.writeFileSync(path.join(root, "ready", "existing.txt"), "keep");
    commitExtractedDirectory(payload, path.join(root, "ready"), false);
    assert.equal(
      fs.readFileSync(path.join(root, "ready", "existing.txt"), "utf8"),
      "keep",
    );
    assert.equal(
      fs.readFileSync(path.join(root, "ready", "new.txt"), "utf8"),
      "new",
    );
    assert.equal(
      fs.readdirSync(root).some((name) => name.startsWith(".edgeless-")),
      false,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
