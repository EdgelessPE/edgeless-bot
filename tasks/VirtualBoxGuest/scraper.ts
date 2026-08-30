import { Err, Ok, Result } from "ts-results";
import { ScraperReturned } from "../../src/class";
import { robustGet } from "../../src/network";

const DOWNLOAD_ROOT = "https://download.virtualbox.org/virtualbox";
const LATEST_STABLE_URL = `${DOWNLOAD_ROOT}/LATEST-STABLE.TXT`;

function parseVersion(response: unknown): Result<string, string> {
  if (typeof response !== "string") {
    return new Err("Error:VirtualBox latest stable version is not text");
  }

  const version = response.trim();
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    return new Err(`Error:Invalid VirtualBox version: ${version}`);
  }

  return new Ok(version);
}

function parseSha256(response: unknown, fileName: string): string | undefined {
  if (typeof response !== "string") {
    return undefined;
  }

  const escapedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = response.match(
    new RegExp(`^([a-fA-F0-9]{64})\\s+[*]?${escapedFileName}$`, "m"),
  );
  return match?.[1]?.toLowerCase();
}

export default async function (): Promise<Result<ScraperReturned, string>> {
  const versionResponse = await robustGet(LATEST_STABLE_URL);
  if (versionResponse.err) {
    return new Err(versionResponse.val);
  }

  const versionResult = parseVersion(versionResponse.val);
  if (versionResult.err) {
    return versionResult;
  }

  const version = versionResult.val;
  const fileName = `VBoxGuestAdditions_${version}.iso`;
  const versionRoot = `${DOWNLOAD_ROOT}/${version}`;
  const result: ScraperReturned = {
    version,
    downloadLink: `${versionRoot}/${fileName}`,
  };

  const checksumResponse = await robustGet(`${versionRoot}/SHA256SUMS`);
  if (checksumResponse.ok) {
    const sha256 = parseSha256(checksumResponse.val, fileName);
    if (sha256) {
      result.validation = { type: "SHA256", value: sha256 };
    }
  }

  return new Ok(result);
}
