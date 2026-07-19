import { ProducerParameters, ProducerReturned } from "../../src/class";
import { Result } from "ts-results";
import {
  IMAGE_FILE_MACHINE_AMD64,
  producePortableAppsOnline,
} from "../Chrome/producer";

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  return producePortableAppsOnline(p, {
    displayName: "Chrome Dev",
    portableDirectory: "GoogleChromePortableDev",
    portableLauncher: "GoogleChromePortable.exe",
    executableRelativePath: "App/Chrome-bin/chrome.exe",
    requiredMachine: IMAGE_FILE_MACHINE_AMD64,
  });
}
