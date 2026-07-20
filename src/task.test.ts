import assert from "node:assert/strict";
import test from "node:test";
import { TaskInstance } from "./class";
import { isTaskSupportedOnOS } from "./task";

function createTask(extra?: TaskInstance["extra"]): TaskInstance {
  return { extra } as TaskInstance;
}

test("runs ordinary tasks on Linux by default", (): void => {
  assert.equal(isTaskSupportedOnOS(createTask(), "Linux"), true);
  assert.equal(
    isTaskSupportedOnOS(createTask({ require_windows: false }), "Linux"),
    true,
  );
});

test("skips explicitly Windows-only tasks on Linux", (): void => {
  assert.equal(
    isTaskSupportedOnOS(createTask({ require_windows: true }), "Linux"),
    false,
  );
});

test("skips missing-version tasks on Linux", (): void => {
  assert.equal(
    isTaskSupportedOnOS(createTask({ missing_version: "app.exe" }), "Linux"),
    false,
  );
});

test("allows platform-specific tasks on Windows", (): void => {
  assert.equal(
    isTaskSupportedOnOS(
      createTask({ require_windows: true, missing_version: "app.exe" }),
      "Windows",
    ),
    true,
  );
});
