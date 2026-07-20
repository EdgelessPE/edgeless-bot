import assert from "node:assert/strict";
import test from "node:test";
import { canUploadDatabase } from "./database";

test("uploads every modified production database", (): void => {
  assert.equal(canUploadDatabase(true, true, true), true);
  assert.equal(canUploadDatabase(false, true, true), false);
  assert.equal(canUploadDatabase(true, false, true), false);
  assert.equal(canUploadDatabase(true, true, false), false);
});
