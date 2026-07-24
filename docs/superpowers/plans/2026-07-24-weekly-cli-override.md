# Weekly CLI Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `-w` override that allows weekly tasks on any day while preserving their existing Thursday behavior when the option is absent.

**Architecture:** Add a runtime-only `MODE_WEEKLY` flag to the parsed configuration and pass it into the existing weekly task predicate. Keep the predicate's Thursday and `missing_version` behavior intact, using the new flag only as an additional reason not to skip. Expose the same flag as a manual boolean input in both GitHub Actions workflows.

**Tech Stack:** TypeScript, minimist, Node.js test runner, pnpm, GitHub Actions YAML

---

## File Map

- `src/config.ts`: default and CLI mapping for `MODE_WEEKLY`.
- `src/class.ts`: runtime configuration type.
- `src/task.ts`: weekly filtering predicate and production call site.
- `src/config.test.ts`: integration test for parsing `-w`.
- `src/task.test.ts`: weekly scheduling and override behavior tests.
- `package.json`: include the new configuration test in the suite.
- `.github/workflows/serve.yml`: manual weekly input and `-w` forwarding.
- `.github/workflows/debug.yml`: manual weekly input and `-w` forwarding.
- `docs/guide/usage.md`: user-facing CLI option documentation.

### Task 1: Weekly Filtering Override

**Files:**

- Modify: `src/task.test.ts`
- Modify: `src/task.ts`

- [ ] **Step 1: Write the failing predicate tests**

Update the weekly test to call `shouldSkipWeeklyTask` with an explicit override:

```typescript
test("keeps Thursday scheduling unless weekly mode overrides it", (): void => {
  const weeklyTask = createTask({ weekly: true });
  assert.equal(shouldSkipWeeklyTask(weeklyTask, 3, false), true);
  assert.equal(shouldSkipWeeklyTask(weeklyTask, 4, false), false);
  assert.equal(shouldSkipWeeklyTask(weeklyTask, 3, true), false);
});
```

Keep and adapt the existing `missing_version` assertion:

```typescript
assert.equal(
  shouldSkipWeeklyTask(
    createTask({ weekly: true, missing_version: "app.exe" }),
    1,
    false,
  ),
  false,
);
```

- [ ] **Step 2: Run the targeted check and verify RED**

Run:

```bash
pnpm exec tsc
```

Expected: FAIL because `shouldSkipWeeklyTask` still accepts two arguments.

- [ ] **Step 3: Add the minimal predicate implementation**

Change the predicate to:

```typescript
function shouldSkipWeeklyTask(
  task: TaskInstance,
  currentDay: number,
  weeklyMode: boolean,
): boolean {
  return Boolean(
    task.extra?.weekly &&
      !task.extra.missing_version &&
      !weeklyMode &&
      MISSING_VERSION_TRY_DAY != currentDay,
  );
}
```

Pass `config.MODE_WEEKLY` from `reserveTask`.

- [ ] **Step 4: Continue to Task 2 before running GREEN**

The production call requires the typed configuration flag added in Task 2.

### Task 2: Parse `-w`

**Files:**

- Create: `src/config.test.ts`
- Modify: `src/config.ts`
- Modify: `src/class.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing CLI integration test**

Create:

```typescript
import assert from "node:assert/strict";
import test from "node:test";

test("maps -w to weekly mode", async (): Promise<void> => {
  const originalArgv = process.argv;
  try {
    process.argv = [originalArgv[0], originalArgv[1], "-w"];
    const { config } = await import("./config");
    assert.equal(config.MODE_WEEKLY, true);
  } finally {
    process.argv = originalArgv;
  }
});
```

Add `dist/src/config.test.js` to the `pnpm test` command.

- [ ] **Step 2: Run the targeted check and verify RED**

Run:

```bash
pnpm exec tsc
```

Expected: FAIL because `CONFIG` has no `MODE_WEEKLY` property.

- [ ] **Step 3: Add the minimal CLI implementation**

In `CONFIG`, add:

```typescript
MODE_WEEKLY: boolean;
```

In `configGenerator`, default it:

```typescript
json["MODE_WEEKLY"] = false;
```

Add this cover-table entry:

```typescript
{
  arg: "w",
  key: "MODE_WEEKLY",
},
```

- [ ] **Step 4: Run targeted tests and verify GREEN**

Run:

```bash
pnpm exec tsc
node --test dist/src/config.test.js dist/src/task.test.js
```

Expected: compilation succeeds and all targeted tests pass.

### Task 3: GitHub Actions Inputs

**Files:**

- Modify: `.github/workflows/serve.yml`
- Modify: `.github/workflows/debug.yml`

- [ ] **Step 1: Add the manual input to each workflow**

Under `workflow_dispatch.inputs`, add:

```yaml
weekly:
  description: Run weekly tasks regardless of weekday
  required: false
  default: false
  type: boolean
```

- [ ] **Step 2: Forward the input**

Add `WEEKLY_INPUT: ${{ inputs.weekly }}` to each Run scripts environment and:

```bash
if [[ "$WEEKLY_INPUT" == "true" ]]; then args+=(-w); fi
```

Do not modify either workflow's trigger or cron configuration.

- [ ] **Step 3: Inspect the workflow diff**

Run:

```bash
git diff -- .github/workflows/serve.yml .github/workflows/debug.yml
```

Expected: only the input, environment variable, and argument forwarding are added.

### Task 4: Final Verification

**Files:**

- Verify all modified files.
- Modify: `docs/guide/usage.md`

- [ ] **Step 1: Document the CLI option**

Add:

```markdown
**-w**

Weekly，立即调度 weekly 任务。不指定此参数时，weekly 任务仍按原有逻辑在周四执行。
```

- [ ] **Step 2: Format changed files**

Run:

```bash
pnpm exec prettier --write src/config.test.ts src/config.ts src/class.ts src/task.test.ts src/task.ts package.json .github/workflows/serve.yml .github/workflows/debug.yml docs/guide/usage.md
```

- [ ] **Step 3: Run the full test suite**

Run:

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Run static checks**

Run:

```bash
pnpm check
pnpm exec prettier --check src/config.test.ts src/config.ts src/class.ts src/task.test.ts src/task.ts package.json .github/workflows/serve.yml .github/workflows/debug.yml docs/guide/usage.md
git diff --check
```

Expected: all commands exit successfully with no errors.

- [ ] **Step 5: Audit scope**

Run:

```bash
git status --short
git diff --stat
git diff
```

Expected: only the planned source, tests, package script, workflows, and plan document are changed.
