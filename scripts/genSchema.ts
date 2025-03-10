import cp from "child_process";
import fs from "fs";
import { resolve } from "path";
import type { JSONSchema4 } from "json-schema";
import * as TJS from "typescript-json-schema";

function main() {
  const program = TJS.getProgramFromFiles([resolve("src/types/nep.ts")], {
    required: true,
  });
  const schema = TJS.generateSchema(program, "NepPackage");
  if (schema == null) {
    console.log("Error:Failed to generate schema");
    return;
  }
  const task: JSONSchema4 = JSON.parse(
    fs.readFileSync("schema/task.json").toString(),
  );
  task.properties!.package_patch = schema as JSONSchema4;
  fs.writeFileSync("schema/task.json", JSON.stringify(task, null, 2));

  cp.execSync("pnpm lint ./schema");
}

main();
