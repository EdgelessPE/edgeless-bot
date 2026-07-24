# Weekly CLI Override Design

## Goal

Add a `-w` command-line option that explicitly allows weekly tasks to run,
without changing their existing Thursday scheduling behavior.

## Behavior

- Without `-w`, weekly tasks keep the existing behavior:
  - weekly tasks run on Thursday;
  - weekly tasks are skipped on other days;
  - the existing `missing_version` exception remains unchanged.
- With `-w`, weekly tasks are allowed to run on any day.
- Ordinary tasks are unaffected.

## Configuration

Add a runtime-only `MODE_WEEKLY` boolean to `CONFIG`. It defaults to `false`
and is set to `true` when minimist parses `-w`.

The weekly task filter will accept the runtime flag as an explicit override of
the weekday check. It will retain the current `missing_version` condition.

## GitHub Actions

Add an optional `weekly` boolean input to both `serve.yml` and `debug.yml`.
When selected, their Bash argument arrays append `-w`.

Existing cron expressions and scheduled-run behavior will not change.

## Tests

Tests will cover:

- a weekly task is skipped outside Thursday without the override;
- a weekly task is allowed on Thursday without the override;
- a weekly task is allowed outside Thursday with the override;
- the existing `missing_version` exception remains unchanged.

Type checking and the complete test suite will verify the final change.
