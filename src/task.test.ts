import assert from "node:assert/strict";
import test from "node:test";
import { Ok } from "ts-results";
import { TaskInstance } from "./class";
import { getTasksToBeExecuted, isTaskSupportedOnOS } from "./task";

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

test("never platform-filters missing-version tasks", (): void => {
  assert.equal(
    isTaskSupportedOnOS(createTask({ missing_version: "app.exe" }), "Linux"),
    true,
  );
  assert.equal(
    isTaskSupportedOnOS(createTask({ missing_version: "app.exe" }), "MacOS"),
    true,
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

test("always schedules missing-version tasks before version comparison", (): void => {
  const tasks = getTasksToBeExecuted([
    {
      taskName: "AnyDesk",
      result: new Ok({
        version: "0.0.0",
        downloadLink: "https://download.anydesk.com/AnyDesk.exe",
      }),
    },
  ]);

  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]?.task.name, "AnyDesk");
});
