import { ProducerParameters, ProducerReturned } from "../../src/class";
import { Err, Ok, Result } from "ts-results";
import { release } from "../../src/p7zip";
import checksum from "../../src/checksum";
import { robustGet } from "../../src/network";
import path from "path";
import fs from "fs";
import shell from "shelljs";
import ini from "ini";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

interface InstallerMetadata {
  downloadUrl: string;
  downloadFilename: string;
  downloadSha256: string;
  extractTo: string;
  extractFilter: string;
}

const PORTABLE_DIRECTORY = "GoogleChromePortable64";
const PORTABLE_LAUNCHER = "GoogleChromePortable.exe";
const IMAGE_FILE_MACHINE_AMD64 = 0x8664;

function getPeMachine(image: Buffer): Result<number, string> {
  if (image.length < 0x40 || image.toString("ascii", 0, 2) !== "MZ") {
    return new Err("Error:Chrome executable has an invalid DOS header");
  }
  const peOffset = image.readUInt32LE(0x3c);
  if (
    peOffset + 6 > image.length ||
    image.toString("binary", peOffset, peOffset + 4) !== "PE\0\0"
  ) {
    return new Err("Error:Chrome executable has an invalid PE header");
  }
  return new Ok(image.readUInt16LE(peOffset + 4));
}

function isSafeRelativePath(value: string): boolean {
  if (value === "" || path.isAbsolute(value)) return false;
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  return normalized !== ".." && !normalized.startsWith("../");
}

function parseInstallerMetadata(
  content: string,
): Result<InstallerMetadata, string> {
  const parsed = ini.parse(content) as Record<string, unknown>;
  const downloadFiles = parsed.DownloadFiles;
  if (typeof downloadFiles !== "object" || downloadFiles === null) {
    return new Err(
      "Error:Chrome installer metadata has no DownloadFiles section",
    );
  }

  const values = downloadFiles as Record<string, unknown>;
  const downloadUrl = values.DownloadURL,
    downloadFilename = values.DownloadFilename,
    downloadSha256 = values.DownloadSHA256,
    extractTo = values.AdvancedExtract1To,
    extractFilter = values.AdvancedExtract1Filter;
  if (
    typeof downloadUrl !== "string" ||
    typeof downloadFilename !== "string" ||
    typeof downloadSha256 !== "string" ||
    typeof extractTo !== "string" ||
    typeof extractFilter !== "string"
  ) {
    return new Err("Error:Chrome installer metadata is incomplete");
  }

  let payloadUrl: URL;
  try {
    payloadUrl = new URL(downloadUrl);
  } catch {
    return new Err("Error:Chrome payload URL is invalid");
  }
  if (payloadUrl.protocol !== "https:") {
    return new Err("Error:Chrome payload URL must use HTTPS");
  }
  if (path.basename(downloadFilename) !== downloadFilename) {
    return new Err("Error:Chrome payload filename must not contain a path");
  }
  if (!/^[a-fA-F0-9]{64}$/.test(downloadSha256)) {
    return new Err("Error:Chrome payload SHA256 is invalid");
  }
  if (!isSafeRelativePath(extractTo)) {
    return new Err("Error:Chrome payload extraction path is unsafe");
  }
  if (extractFilter !== "*") {
    return new Err("Error:Chrome payload extraction filter is unsupported");
  }

  return new Ok({
    downloadUrl,
    downloadFilename,
    downloadSha256: downloadSha256.toLowerCase(),
    extractTo,
    extractFilter,
  });
}

async function downloadPayload(
  metadata: InstallerMetadata,
  workshop: string,
): Promise<Result<string, string>> {
  const payloadPath = path.join(workshop, metadata.downloadFilename);
  const response = await robustGet(metadata.downloadUrl, {
    responseType: "stream",
  });
  if (response.err) return new Err(response.val);

  const payload = response.unwrap();
  if (!(payload instanceof Readable)) {
    return new Err("Error:Chrome payload response is not a readable stream");
  }
  try {
    await pipeline(payload, fs.createWriteStream(payloadPath));
  } catch (error) {
    shell.rm("-f", payloadPath);
    return new Err(`Error:Can't download Chrome payload: ${String(error)}`);
  }
  return new Ok(payloadPath);
}

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  const { downloadedFile, workshop } = p;
  const installerPath = path.join(workshop, downloadedFile);
  const readyRelativePath = "_ready";
  const portableRelativePath = path.join(readyRelativePath, PORTABLE_DIRECTORY);
  const portableDir = path.join(workshop, portableRelativePath);

  // 解压在线安装器，读取 PortableApps 提供的下载元数据
  if (!(await release(installerPath, portableRelativePath, true, workshop))) {
    return new Err(`Error:Can't release ${downloadedFile}`);
  }
  const installerIniPath = path.join(
    portableDir,
    "App",
    "AppInfo",
    "installer.ini",
  );
  if (!fs.existsSync(installerIniPath)) {
    return new Err("Error:Chrome installer metadata file not found");
  }
  const metadataResult = parseInstallerMetadata(
    fs.readFileSync(installerIniPath, "utf8"),
  );
  if (metadataResult.err) return metadataResult;
  const metadata = metadataResult.unwrap();

  // 下载并校验在线安装器声明的 Chrome 原始载荷
  const payloadResult = await downloadPayload(metadata, workshop);
  if (payloadResult.err) return payloadResult;
  const payloadPath = payloadResult.unwrap();
  if (!(await checksum(payloadPath, "SHA256", metadata.downloadSha256))) {
    shell.rm("-f", payloadPath);
    return new Err(
      `Error:Can't validate Chrome payload, expect ${metadata.downloadSha256}`,
    );
  }

  // 将载荷解压到 installer.ini 指定的 PortableApps 子目录
  const extracted = await release(
    payloadPath,
    metadata.extractTo,
    false,
    portableDir,
  );
  shell.rm("-f", payloadPath, installerPath);
  if (!extracted) {
    return new Err("Error:Can't release Chrome payload");
  }

  // 清理
  const deleteList = [
    "$PLUGINSDIR",
    "7zTemp",
    "Other",
    "help.html",
    "App/readme.txt",
    "App/AppInfo/*.ico",
    "App/AppInfo/*.png",
  ];
  for (const f of deleteList) {
    shell.rm("-rf", path.join(portableDir, f));
  }

  const chromePath = path.join(portableDir, "App", "Chrome-bin", "chrome.exe");
  const requiredFiles = [path.join(portableDir, PORTABLE_LAUNCHER), chromePath];
  for (const requiredFile of requiredFiles) {
    if (!fs.existsSync(requiredFile)) {
      return new Err(`Error:Chrome produced file not found: ${requiredFile}`);
    }
  }
  const machineResult = getPeMachine(fs.readFileSync(chromePath));
  if (machineResult.err) return machineResult;
  if (machineResult.unwrap() !== IMAGE_FILE_MACHINE_AMD64) {
    return new Err("Error:Chrome produced executable is not AMD64");
  }

  // Return ready directory
  return new Ok({
    readyRelativePath,
  });
}

export { getPeMachine, parseInstallerMetadata };
