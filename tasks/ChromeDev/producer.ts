import { ProducerParameters, ProducerReturned } from "../../src/class";
import { Result } from "ts-results";
import { produceChromePortable } from "../Chrome/producer";

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  return produceChromePortable(p, {
    portableDirectory: "GoogleChromePortableDev",
    portableLauncher: "GoogleChromePortable.exe",
  });
}
