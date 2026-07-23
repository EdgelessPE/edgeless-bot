import assert from "node:assert/strict";
import test from "node:test";
import { getPEVersionCommand, parsePEVersionOutput } from "./peVersion";

test("passes a PE path separately to the Linux version reader", (): void => {
  const file = "/tmp/task with spaces/app.exe";
  const command = getPEVersionCommand(file);

  assert.equal(command.command, "peversion");
  assert.deepEqual(command.args, [file]);
});

test("parses the fixed four-part PE file version", (): void => {
  assert.equal(parsePEVersionOutput("1.2.3.4\n"), "1.2.3.4");
});
