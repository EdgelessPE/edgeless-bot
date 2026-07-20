import assert from "node:assert/strict";
import test from "node:test";
import { shouldCheckMissingVersion } from "./missingVersion";

test("checks missing-version tasks on their scheduled day", (): void => {
  assert.equal(shouldCheckMissingVersion(false, false, 4, 4), true);
  assert.equal(shouldCheckMissingVersion(false, false, 3, 4), false);
});

test("checks missing-version tasks on every forced run", (): void => {
  assert.equal(shouldCheckMissingVersion(true, false, 3, 4), true);
});

test("checks explicitly selected missing-version tasks", (): void => {
  assert.equal(shouldCheckMissingVersion(false, true, 3, 4), true);
});
