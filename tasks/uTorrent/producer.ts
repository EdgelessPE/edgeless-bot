import { ProducerParameters, ProducerReturned } from "../../src/class";
import { Result } from "ts-results";
import { producePortableAppsOnline } from "../Chrome/producer";

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  return producePortableAppsOnline(p, {
    displayName: "uTorrent",
    portableDirectory: "uTorrentPortable",
    portableLauncher: "uTorrentPortable.exe",
  });
}
