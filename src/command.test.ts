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

test(
  "normalizes Windows separators preserved in extracted file names",
  { skip: process.platform === "win32" },
  (): void => {
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
  },
);

test(
  "normalizes nested directories with preserved Windows separators",
  { skip: process.platform === "win32" },
  (): void => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "edgeless-unzip-"));
    try {
      const preservedDirectory = path.join(root, "outer\\inner");
      fs.mkdirSync(preservedDirectory);
      fs.writeFileSync(
        path.join(preservedDirectory, "nested\\file.exe"),
        "test",
      );
      normalizeExtractedPaths(root);
      assert.equal(
        fs.existsSync(path.join(root, "outer", "inner", "nested", "file.exe")),
        true,
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  },
);

test(
  "rejects preserved Windows paths escaping the extraction root",
  { skip: process.platform === "win32" },
  (): void => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "edgeless-unzip-"));
    const escaped = path.join(
      path.dirname(root),
      `escaped-${path.basename(root)}`,
    );
    try {
      fs.writeFileSync(
        path.join(root, `..\\${path.basename(escaped)}`),
        "test",
      );
      assert.throws(
        () => normalizeExtractedPaths(root),
        /Unsafe extracted path/,
      );
      assert.equal(fs.existsSync(escaped), false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(escaped, { recursive: true, force: true });
    }
  },
);

test(
  "normalizes explicit Windows directories with trailing separators and merges their children",
  { skip: process.platform === "win32" },
  () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "edgeless-unzip-"));
    try {
      fs.mkdirSync(
        path.join(root, "Edge_Portable", "Edge", "154", "EBWebView"),
        { recursive: true },
      );
      fs.writeFileSync(
        path.join(
          root,
          "Edge_Portable",
          "Edge",
          "154",
          "EBWebView",
          "existing.dll",
        ),
        "existing",
      );
      const directory = path.join(
        root,
        "Edge_Portable\\Edge\\154\\EBWebView\\",
      );
      fs.mkdirSync(directory);
      fs.writeFileSync(path.join(directory, "new.dll"), "new");
      fs.writeFileSync(
        path.join(root, "Edge_Portable\\Edge\\msedge.exe"),
        "browser",
      );
      normalizeExtractedPaths(root);
      assert.equal(
        fs.readFileSync(
          path.join(
            root,
            "Edge_Portable",
            "Edge",
            "154",
            "EBWebView",
            "existing.dll",
          ),
          "utf8",
        ),
        "existing",
      );
      assert.equal(
        fs.readFileSync(
          path.join(
            root,
            "Edge_Portable",
            "Edge",
            "154",
            "EBWebView",
            "new.dll",
          ),
          "utf8",
        ),
        "new",
      );
      assert.equal(
        fs.readFileSync(
          path.join(root, "Edge_Portable", "Edge", "msedge.exe"),
          "utf8",
        ),
        "browser",
      );
      assert.deepEqual(fs.readdirSync(root), ["Edge_Portable"]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  },
);

test(
  "still rejects malformed Windows directory paths and trailing separators on files",
  { skip: process.platform === "win32" },
  () => {
    for (const name of [
      "..\\escape\\",
      "\\absolute\\",
      "outer\\\\inner\\",
      "outer\\.\\inner\\",
      "outer\\\\",
    ]) {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "edgeless-unzip-"));
      try {
        fs.mkdirSync(path.join(root, name));
        assert.throws(
          () => normalizeExtractedPaths(root),
          /Unsafe extracted path/,
        );
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "edgeless-unzip-"));
    try {
      fs.writeFileSync(path.join(root, "file\\"), "invalid");
      assert.throws(
        () => normalizeExtractedPaths(root),
        /Unsafe extracted path/,
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  },
);

test(
  "directory normalization rejects file collisions and symlink destinations",
  { skip: process.platform === "win32" },
  () => {
    for (const kind of [
      "collision",
      "symlink",
      "dangling symlink",
      "symlink parent",
    ]) {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "edgeless-unzip-"));
      const outside = fs.mkdtempSync(
        path.join(os.tmpdir(), "edgeless-outside-"),
      );
      try {
        fs.writeFileSync(path.join(outside, "keep.txt"), "keep");
        const source = path.join(
          root,
          kind === "symlink parent" ? "App\\nested\\" : "App\\",
        );
        fs.mkdirSync(source);
        fs.writeFileSync(path.join(source, "keep.txt"), "replace");
        if (kind === "collision") {
          fs.mkdirSync(path.join(root, "App"));
          fs.writeFileSync(path.join(root, "App", "keep.txt"), "keep");
        } else {
          fs.symlinkSync(
            kind === "dangling symlink"
              ? path.join(outside, "missing")
              : outside,
            path.join(root, "App"),
          );
        }
        assert.throws(
          () => normalizeExtractedPaths(root),
          /already exists|traverses symlink/,
        );
        assert.equal(
          fs.readFileSync(path.join(outside, "keep.txt"), "utf8"),
          "keep",
        );
        if (kind === "collision")
          assert.equal(
            fs.readFileSync(path.join(root, "App", "keep.txt"), "utf8"),
            "keep",
          );
        assert.equal(fs.existsSync(path.join(outside, "nested")), false);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
        fs.rmSync(outside, { recursive: true, force: true });
      }
    }
  },
);

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
