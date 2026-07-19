import assert from "node:assert/strict";
import test from "node:test";
import { getPeMachine, parseInstallerMetadata } from "./producer";

const VALID_INSTALLER_INI = `[DownloadFiles]
DownloadURL=https://dl.google.com/chrome_payload.exe
DownloadFilename=chrome_payload.exe
DownloadSHA256=17c0c4f8007a394cd5034ff7fb11ead4e3ffd2ea631c46f59df4788ca3c8c818
AdvancedExtract1To=App
AdvancedExtract1Filter=*
`;

test("parses validated Chrome payload metadata", (): void => {
  const result = parseInstallerMetadata(VALID_INSTALLER_INI);

  assert.equal(result.ok, true);
  if (result.err) assert.fail("Expected valid Chrome installer metadata");
  assert.deepEqual(result.unwrap(), {
    downloadUrl: "https://dl.google.com/chrome_payload.exe",
    downloadFilename: "chrome_payload.exe",
    downloadSha256:
      "17c0c4f8007a394cd5034ff7fb11ead4e3ffd2ea631c46f59df4788ca3c8c818",
    extractTo: "App",
    extractFilter: "*",
  });
});

test("rejects missing Chrome payload metadata", (): void => {
  const result = parseInstallerMetadata(`[DownloadFiles]
DownloadURL=https://dl.google.com/chrome_payload.exe
`);

  assert.equal(result.err, true);
});

test("rejects extraction paths outside the PortableApps directory", (): void => {
  const result = parseInstallerMetadata(
    VALID_INSTALLER_INI.replace(
      "AdvancedExtract1To=App",
      "AdvancedExtract1To=../App",
    ),
  );

  assert.equal(result.err, true);
});

function createPeImage(machine: number): Buffer {
  const image = Buffer.alloc(0x46);
  image.write("MZ", 0, "ascii");
  image.writeUInt32LE(0x40, 0x3c);
  image.write("PE\0\0", 0x40, "binary");
  image.writeUInt16LE(machine, 0x44);
  return image;
}

test("reads the AMD64 machine type from a PE image", (): void => {
  const result = getPeMachine(createPeImage(0x8664));

  assert.equal(result.ok, true);
  if (result.err) assert.fail("Expected a valid PE image");
  assert.equal(result.unwrap(), 0x8664);
});

test("distinguishes an x86 PE image from AMD64", (): void => {
  const result = getPeMachine(createPeImage(0x014c));

  assert.equal(result.ok, true);
  if (result.err) assert.fail("Expected a valid PE image");
  assert.equal(result.unwrap(), 0x014c);
});
