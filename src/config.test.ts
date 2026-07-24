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
