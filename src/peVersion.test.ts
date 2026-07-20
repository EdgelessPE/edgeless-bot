import assert from "node:assert/strict";
import test from "node:test";
import { getPEVersionCommand, parsePEVersionOutput } from "./peVersion";

test("passes a PE path separately to the Linux version reader", (): void => {
  const file = "/tmp/task with spaces/app.exe";
  const command = getPEVersionCommand(file);

  assert.equal(command.command, "peres");
  assert.deepEqual(command.args, ["-v", file]);
});

test("reads File Version without confusing Product Version", (): void => {
  assert.equal(
    parsePEVersionOutput(
      "File Version:                    1.2.3.4\nProduct Version:                 9.8.7.6\n",
    ),
    "1.2.3.4",
  );
});
