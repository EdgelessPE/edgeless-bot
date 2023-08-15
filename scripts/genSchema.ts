import fs from "fs";
import type { JSONSchema4} from 'json-schema'
import { resolve } from "path";
import * as TJS from "typescript-json-schema";

function main() {
  const program = TJS.getProgramFromFiles([resolve("src/types/nep.ts")], {
    required: true,
  });
  const schema = TJS.generateSchema(program, "NepPackage");
	if(schema==null) {
		console.log('Error:Failed to generate schema')
		return
	}
	const template:JSONSchema4={
		$schema: "http://json-schema.org/draft-04/schema#",
		definitions: {
			NepPackage:schema as JSONSchema4
		}
	}
  fs.writeFileSync("schema/nep.json", JSON.stringify(template, null, 2));
}

main();
