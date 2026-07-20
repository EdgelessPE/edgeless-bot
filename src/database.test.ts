import assert from "node:assert/strict";
import test from "node:test";
import { canUploadDatabase } from "./database";

test("uploads a modified database only after a successful run", (): void => {
  assert.equal(canUploadDatabase(true, true, true, true), true);
  assert.equal(canUploadDatabase(false, true, true, true), false);
  assert.equal(canUploadDatabase(true, false, true, true), false);
  assert.equal(canUploadDatabase(true, true, false, true), false);
  assert.equal(canUploadDatabase(true, true, true, false), false);
});
