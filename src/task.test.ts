import assert from "node:assert/strict";
import test from "node:test";
import { TaskInstance } from "./class";
import { isTaskSupportedOnOS, reserveTask, shouldSkipWeeklyTask } from "./task";

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

test("runs missing-version tasks on Linux", (): void => {
  assert.equal(
    isTaskSupportedOnOS(createTask({ missing_version: "app.exe" }), "Linux"),
    true,
  );
});

test("skips missing-version tasks on unsupported POSIX platforms", (): void => {
  assert.equal(
    isTaskSupportedOnOS(createTask({ missing_version: "app.exe" }), "MacOS"),
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

test("does not weekly-filter missing-version tasks while loading", (): void => {
  assert.equal(
    shouldSkipWeeklyTask(
      createTask({ weekly: true, missing_version: "app.exe" }),
      1,
      false,
    ),
    false,
  );
});

test("keeps Thursday scheduling unless weekly mode overrides it", (): void => {
  const weeklyTask = createTask({ weekly: true });
  assert.equal(shouldSkipWeeklyTask(weeklyTask, 3, false), true);
  assert.equal(shouldSkipWeeklyTask(weeklyTask, 4, false), false);
  assert.equal(shouldSkipWeeklyTask(weeklyTask, 3, true), false);
});

test("skips explicitly disabled tasks", (): void => {
  assert.equal(reserveTask(createTask({ disabled: true })), false);
});
