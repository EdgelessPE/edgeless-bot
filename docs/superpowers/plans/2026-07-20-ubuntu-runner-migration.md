# Ubuntu Runner Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Serve and Debug GitHub Actions workflows from Windows Server 2025 to GitHub-hosted Ubuntu 24.04 while preserving task filtering, package production, remote upload, and database synchronization.

**Architecture:** Add small platform helpers for task paths and external command invocation, then adapt archive/Inno/cloud callers to pass argument arrays instead of shell strings. Migrate Debug first as the non-destructive validation path, then migrate Serve with explicit Linux tool installation, private configuration deployment, concurrency protection, and manual validation before the schedule is restored.

**Tech Stack:** Node.js 24, TypeScript 5, Node test runner, pnpm 9, C11, GitHub Actions, Ubuntu 24.04, aria2, 7-Zip, innoextract, rclone, cloud139.

## Global Constraints

- Target runner is GitHub-hosted `ubuntu-24.04` x64, never `ubuntu-latest`.
- Node.js must remain `24.x`; pnpm must remain major version 9.
- An omitted or commented `extra.require_windows` remains `false`; only explicit `true` skips a task.
- `missing_version` tasks execute on Ubuntu by reading the PE fixed file version through the bundled C11 reader; unsupported non-Windows platforms continue to skip them.
- Functions must declare explicit return types; TypeScript strict mode remains enabled.
- Business comments remain Chinese; complex implementation comments may use English.
- Secrets and remote configuration must never be printed or uploaded as artifacts.
- Each production-affecting change must pass `pnpm check` and the relevant focused tests before commit.

---

### Task 1: Cross-platform prepare script and test command

**Files:**

- Modify: `package.json`
- Test: `package.json` scripts executed from the repository root

**Interfaces:**

- Consumes: Node.js built-in `fs.rmSync`.
- Produces: cross-platform `prepare` and repeatable `test` scripts used by local development and both workflows.

- [x] **Step 1: Demonstrate the Windows-only prepare failure surface**

Run:

```bash
node -e "const p=require('./package.json'); if (!p.scripts.prepare.includes('del ')) process.exit(1)"
```

Expected: exit 0, proving the current script still contains Windows `del` commands.

- [x] **Step 2: Replace the prepare script and define focused tests**

Set the scripts to:

```json
{
  "prepare": "husky && node -e \"const fs=require('node:fs'); fs.rmSync('dist',{recursive:true,force:true}); fs.rmSync('database.json',{force:true})\"",
  "test": "tsc && node --test dist/src/platform.test.js dist/src/inno.test.js dist/tasks/Chrome/producer.test.js"
}
```

- [x] **Step 3: Verify cleanup is idempotent**

Run twice:

```bash
pnpm run prepare
pnpm run prepare
```

Expected: both commands exit 0 when `dist` and `database.json` are absent.

- [x] **Step 4: Verify type checking**

Run: `pnpm check`

Expected: exit 0 with no TypeScript errors.

- [x] **Step 5: Commit**

```bash
git add package.json
git commit -m "build: make prepare script cross-platform"
```

### Task 2: Normalize task-relative paths

**Files:**

- Create: `src/platform.test.ts`
- Modify: `src/platform.ts`
- Modify: `src/task.ts`
- Modify: `templates/producers/Recursive_Unzip.ts`

**Interfaces:**

- Consumes: task configuration strings that may contain `/` or `\` separators.
- Produces: `normalizeTaskPath(value: string): string`, which returns a relative path using the host separator and leaves regex-like `/.../` values untouched by callers.

- [x] **Step 1: Write failing path normalization tests**

Add to `src/platform.test.ts`:

```typescript
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { normalizeTaskPath } from "./platform";

test("normalizes every Windows task path separator", (): void => {
  assert.equal(
    normalizeTaskPath("App\\Chrome-bin\\chrome.exe"),
    ["App", "Chrome-bin", "chrome.exe"].join(path.sep),
  );
});

test("keeps relative task paths relative", (): void => {
  assert.equal(
    path.isAbsolute(normalizeTaskPath("\\KeqingNiuza\\app.exe")),
    false,
  );
});

test("normalizes POSIX task paths on every host", (): void => {
  assert.equal(
    normalizeTaskPath("App/Chrome-bin/chrome.exe"),
    ["App", "Chrome-bin", "chrome.exe"].join(path.sep),
  );
});
```

- [x] **Step 2: Run the focused test to verify it fails**

Run:

```bash
pnpm exec tsc
node --test dist/src/platform.test.js
```

Expected: compilation fails because `normalizeTaskPath` is not exported.

- [x] **Step 3: Implement the helper**

Add to `src/platform.ts` and export it:

```typescript
function normalizeTaskPath(value: string): string {
  return value
    .replace(/^[\\/]+/, "")
    .split(/[\\/]+/)
    .join(path.sep);
}
```

- [x] **Step 4: Apply normalization only to path-valued fields**

Use `normalizeTaskPath` for:

- parsed `build_manifest` entries before `path.resolve`;
- parsed `build_delete`, `build_cover`, and `missing_version` values;
- `sourceFile`, `innoSetupRename` keys/values, and non-regex `recursiveUnzipList` entries in `Recursive_Unzip`.

Keep entries whose first and last characters are `/` on the regex matching path.

- [x] **Step 5: Run path tests and existing Chrome tests**

Run:

```bash
pnpm exec tsc
node --test dist/src/platform.test.js dist/tasks/Chrome/producer.test.js
```

Expected: all tests pass.

- [x] **Step 6: Commit**

```bash
git add src/platform.ts src/platform.test.ts src/task.ts templates/producers/Recursive_Unzip.ts
git commit -m "fix: normalize task paths across platforms"
```

### Task 3: Add platform-specific Inno extraction

**Files:**

- Create: `src/inno.test.ts`
- Modify: `src/inno.ts`
- Modify: `src/platform.ts`

**Interfaces:**

- Consumes: `getOS()`, `where("innounp")`, and new `where("innoextract")` lookup results.
- Produces: `getInnoCommand(os: OS, file: string, intoDir: string): { command: Commands; args: string[] }` and unchanged `releaseInno(...)` behavior.

- [x] **Step 1: Write failing command-generation tests**

Add to `src/inno.test.ts`:

```typescript
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
```

- [x] **Step 2: Run the focused test to verify it fails**

Run: `pnpm exec tsc`

Expected: compilation fails because `getInnoCommand` and `innoextract` are not defined.

- [x] **Step 3: Add command discovery and argument generation**

- Export `OS` from `src/platform.ts`.
- Add `"innoextract"` to `Commands` and search `innoextract` from PATH plus `./innoextract` and `./bin/innoextract`.
- Implement `getInnoCommand` with explicit return type.
- Call `execFileSync(binary, args, { cwd })` from `releaseInno`.
- Add `innoextract` to Linux platform preflight; retain `innounp` for Windows Inno execution.

- [x] **Step 4: Run focused tests**

Run:

```bash
pnpm exec tsc
node --test dist/src/inno.test.js dist/src/platform.test.js
```

Expected: all tests pass.

- [x] **Step 5: Commit**

```bash
git add src/inno.ts src/inno.test.ts src/platform.ts
git commit -m "feat: support Inno extraction on Linux"
```

### Task 4: Remove shell-string command execution

**Files:**

- Modify: `src/platform.ts`
- Modify: `src/p7zip.ts`
- Modify: `src/aria2c.ts`
- Modify: `src/cloud139.ts`
- Modify: `src/cloud189.ts`
- Modify: `src/rclone.ts`
- Modify: `src/index.ts`
- Modify: `src/utils.ts`

**Interfaces:**

- Consumes: raw executable paths from `where(command)`.
- Produces: external process calls that pass all paths, URLs, tokens, and remote names as separate arguments.

- [x] **Step 1: Make `where` return raw executable paths**

Remove embedded quote characters from filesystem results. Replace `which/where` shell strings with `execFileSync(testCmd, [node], { stdio: "ignore" })`.

- [x] **Step 2: Convert archive and download calls**

- `p7zip.ts`: use `execFileSync(p7zip, ["x", file, `-o${intoDir}`, "-y"], { cwd })` and enumerate ready-directory entries for compression instead of passing a shell `*` wildcard.
- `aria2c.ts`: use `execFile` for the aria2 daemon and `execFileSync("curl", ["-k", "-L", "-A", UA, "-o", finalPath, ...refererArgs, url])` for fallback downloads.

- [x] **Step 3: Convert cloud and database calls**

- `cloud139.ts` and `cloud189.ts`: pass login credentials, local paths, and remote paths as argument arrays.
- `rclone.ts` and `index.ts`: pass remote specifications as arguments and retain existing timeouts/environment settings.
- `utils.ts`: execute PECMD with `["_press.wcs"]` rather than a shell command string.

- [x] **Step 4: Verify no migration-critical shell strings remain**

Run:

```bash
rg -n 'execSync\(`|exec\(`|shell\.exec\(' src templates
```

Expected: only the intentionally Windows-only PowerShell version fallback and `move /y` recovery remain; both are unreachable for normal Ubuntu tasks.

- [x] **Step 5: Run the complete local verification suite**

Run:

```bash
pnpm test
pnpm check
```

Expected: all tests pass and TypeScript exits 0.

- [x] **Step 6: Commit**

```bash
git add src/platform.ts src/p7zip.ts src/aria2c.ts src/cloud139.ts src/cloud189.ts src/rclone.ts src/index.ts src/utils.ts
git commit -m "refactor: pass external command arguments safely"
```

### Task 5: Migrate Debug workflow

**Files:**

- Modify: `.github/workflows/debug.yml`

**Interfaces:**

- Consumes: Ubuntu packages and the repository `pnpm test`/`pnpm dev` commands.
- Produces: a non-destructive Ubuntu PR workflow with no remote upload or database update.

- [x] **Step 1: Replace the runner and dependency setup**

- Set `runs-on: ubuntu-24.04` and `timeout-minutes: 30`.
- Add `permissions: contents: read`.
- Install `aria2`, `7zip`, `curl`, `innoextract`, and `ca-certificates` with `apt-get`.
- Enable Corepack, prepare pnpm 9.12.2, and run `pnpm install --frozen-lockfile`.
- Configure `actions/setup-node` with `cache: pnpm` and `cache-dependency-path: pnpm-lock.yaml`.

- [x] **Step 2: Add verification before Debug execution**

Run tool version checks, then execute:

```bash
pnpm test
pnpm dev -g -e "GITHUB_TOKEN=${{ secrets.GITHUB_TOKEN }}"
```

Keep Debug mode responsible for disabling remote upload and database writes.

- [x] **Step 3: Validate workflow syntax locally**

Run a YAML parser available in the workspace or inspect with `npx prettier --check .github/workflows/debug.yml`.

Expected: exit 0.

- [x] **Step 4: Commit**

```bash
git add .github/workflows/debug.yml
git commit -m "ci: migrate Debug workflow to Ubuntu"
```

### Task 6: Migrate Serve workflow

**Files:**

- Modify: `.github/workflows/serve.yml`

**Interfaces:**

- Consumes: `RCLONE_TOKEN`, `CLOUD139_TOKEN`, `GITHUB_TOKEN`, the private `Cnotech/rclone` configuration repository, and the `Cnotech/cloud139` Linux x86_64 release asset.
- Produces: serialized, manually triggered Ubuntu production runs with database pull/push and cloud139 upload/delete support.

- [x] **Step 1: Add runner safety controls**

- Set `runs-on: ubuntu-24.04`, `timeout-minutes: 360`, and `permissions: contents: read`.
- Add a workflow-level concurrency group dedicated to Serve and set `cancel-in-progress: false`.
- Temporarily remove or comment the `schedule` trigger while retaining `workflow_dispatch`.

- [x] **Step 2: Install the Ubuntu toolchain**

- Reuse the Node/Corepack/pnpm and apt setup from Debug.
- Install the Ubuntu `rclone` package.
- Checkout `Cnotech/rclone` only for its private configuration; copy the exact rclone and cloud189 configuration files to their Linux default directories with mode `0600`.
- Download exactly `cloud139-linux-x86_64.tar.gz`, read its SHA-256 digest from the GitHub release asset metadata, fail if the digest is absent or mismatched, extract it, and install the binary with mode `0755`.

- [x] **Step 3: Add a fail-fast preflight**

Check paths and versions for `node`, `pnpm`, `aria2c`, `7z` or `7zz`, `curl`, `innoextract`, `rclone`, and `cloud139`. Validate `rclone listremotes` contains `kanuo:` without printing the configuration.

- [x] **Step 4: Preserve production execution**

Run `pnpm test`, then execute the existing Serve command with `CLOUD139_TOKEN` supplied through workflow `env`, not interpolated into a shell command.

- [x] **Step 5: Validate formatting and commit**

Run:

```bash
npx prettier --check .github/workflows/serve.yml
```

Expected: exit 0.

```bash
git add .github/workflows/serve.yml
git commit -m "ci: migrate Serve workflow to Ubuntu"
```

### Task 7: Remote validation, schedule activation, and final audit

**Files:**

- Modify: `.github/workflows/serve.yml`
- Modify: `agent-docs/linux-runner-migration.md`

**Interfaces:**

- Consumes: successful Debug runs and manually dispatched Serve runs.
- Produces: restored daily schedule and recorded migration evidence.

- [ ] **Step 1: Push and validate Debug through a Pull Request**

Confirm type tests and representative non-remote builds pass on `ubuntu-24.04`, including standard archive, Inno, recursive unzip, PortableApps, Chinese/space path, skipped Windows-only tasks, and PE-version-based `missing_version` tasks.

Status: the hosted `ubuntu-24.04` environment check and a task run succeeded on 2026-07-20. The representative task matrix and workflow run link are still pending, so this step remains open.

- [ ] **Step 2: Manually dispatch Serve with representative tasks**

Verify cloud139 login/upload/list/delete, rclone database pull/push/read-back, build retention, and absence of secrets in logs.

- [ ] **Step 3: Restore the schedule**

Restore `cron: "0 20 * * *"` only after the manual production checks pass.

- [ ] **Step 4: Record evidence in the migration document**

Mark completed checklist items and add links to the successful Debug and Serve workflow runs without copying secrets or logs containing credentials.

- [ ] **Step 5: Observe and close**

Confirm three consecutive scheduled Serve runs complete without platform errors, hangs, duplicate uploads, or database overwrite. Then remove temporary diagnostic output.

- [ ] **Step 6: Commit final activation**

```bash
git add .github/workflows/serve.yml agent-docs/linux-runner-migration.md
git commit -m "ci: enable Ubuntu Serve schedule"
```
