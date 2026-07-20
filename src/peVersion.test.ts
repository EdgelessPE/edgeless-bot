import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { getPEVersionCommand } from "./peVersion";

test("passes a PE path separately to the Linux version reader", (): void => {
  const file = "/tmp/task with spaces/app.exe";
  const command = getPEVersionCommand(file);

  assert.equal(command.command, "python3");
  assert.equal(path.basename(command.args[0]), "read_pe_version.py");
  assert.equal(command.args[1], file);
});
