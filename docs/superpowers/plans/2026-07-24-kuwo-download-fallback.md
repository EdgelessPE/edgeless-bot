# Kuwo Download Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Kuwo Music scraper fall back across official PC download channels when the preferred channel fails.

**Architecture:** Extract the channel-selection loop into a small async function with an injectable fetch callback. Production uses `robustGet` with the existing Referer, while tests supply deterministic results and assert channel order.

**Tech Stack:** TypeScript, ts-results, Node.js test runner

---

### Task 1: Add Failing Fallback Tests

**Files:**

- Create: `tasks/酷我音乐/scraper.test.ts`
- Modify: `package.json`

- [ ] Add tests for preferred-channel success, request failure fallback, invalid-payload fallback, and total failure.
- [ ] Add `dist/tasks/酷我音乐/scraper.test.js` to `pnpm test`.
- [ ] Run `node node_modules/typescript/bin/tsc` and confirm RED because `fetchKuwoDownloadUrl` is not exported.

### Task 2: Implement Official Channel Fallback

**Files:**

- Modify: `tasks/酷我音乐/scraper.ts`

- [ ] Add ordered channels `web_1`, `web_2`, and `web_6`.
- [ ] Add an explicitly typed injectable fetch callback.
- [ ] Return the first valid `data.url`; continue on request errors and invalid payloads.
- [ ] Make the default scraper return an error only after every channel fails.
- [ ] Compile and run the targeted test until GREEN.

### Task 3: Verify

**Files:**

- Verify all modified files.

- [ ] Format the scraper, test, package file, and plan.
- [ ] Run the targeted Kuwo test.
- [ ] Run the compiled real scraper against the current official API and verify it returns a `pkgdown.kuwo.cn` URL.
- [ ] Run TypeScript `--noEmit`, Prettier check, and `git diff --check`.
- [ ] Audit that only the Kuwo scraper, test registration, test, and plan changed.
