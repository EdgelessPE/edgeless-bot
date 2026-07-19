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

interface InstallerDownload {
  downloadUrl: string;
  downloadFilename: string;
  downloadSha256: string;
  destination:
    | { type: "download"; to: string }
    | { type: "extract"; to: string; filter: string };
}

interface PortableAppsOnlineOptions {
  displayName: string;
  portableDirectory: string;
  portableLauncher: string;
  executableRelativePath?: string;
  requiredMachine?: number;
}

const IMAGE_FILE_MACHINE_AMD64 = 0x8664;

function getPeMachine(image: Buffer): Result<number, string> {
  if (image.length < 0x40 || image.toString("ascii", 0, 2) !== "MZ") {
    return new Err("Error:Executable has an invalid DOS header");
  }
  const peOffset = image.readUInt32LE(0x3c);
  if (
    peOffset + 6 > image.length ||
    image.toString("binary", peOffset, peOffset + 4) !== "PE\0\0"
  ) {
    return new Err("Error:Executable has an invalid PE header");
  }
  return new Ok(image.readUInt16LE(peOffset + 4));
}

function isSafeRelativePath(value: string): boolean {
  if (value === "" || path.isAbsolute(value)) return false;
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  return normalized !== ".." && !normalized.startsWith("../");
}

function parseInstallerDownloads(
  content: string,
): Result<InstallerDownload[], string> {
  const parsed = ini.parse(content) as Record<string, unknown>;
  const downloadFiles = parsed.DownloadFiles;
  if (typeof downloadFiles !== "object" || downloadFiles === null) {
    return new Err(
      "Error:PortableApps installer metadata has no DownloadFiles section",
    );
  }

  const values = downloadFiles as Record<string, unknown>;
  const downloads: InstallerDownload[] = [];
  for (let index = 1; index <= 10; index++) {
    const suffix = index === 1 ? "" : String(index);
    const downloadUrl = values[`Download${suffix}URL`];
    if (downloadUrl === undefined) continue;
    const downloadFilename = values[`Download${suffix}Filename`],
      downloadSha256 = values[`Download${suffix}SHA256`],
      downloadTo = values[`Download${suffix}To`],
      extractTo = values[`AdvancedExtract${index}To`],
      extractFilter = values[`AdvancedExtract${index}Filter`];
    if (
      typeof downloadUrl !== "string" ||
      typeof downloadFilename !== "string" ||
      typeof downloadSha256 !== "string"
    ) {
      return new Err("Error:PortableApps installer metadata is incomplete");
    }

    let payloadUrl: URL;
    try {
      payloadUrl = new URL(downloadUrl);
    } catch {
      return new Err("Error:PortableApps payload URL is invalid");
    }
    if (payloadUrl.protocol !== "https:") {
      return new Err("Error:PortableApps payload URL must use HTTPS");
    }
    if (path.basename(downloadFilename) !== downloadFilename) {
      return new Err(
        "Error:PortableApps payload filename must not contain a path",
      );
    }
    if (!/^[a-fA-F0-9]{64}$/.test(downloadSha256)) {
      return new Err("Error:PortableApps payload SHA256 is invalid");
    }

    let destination: InstallerDownload["destination"];
    if (typeof downloadTo === "string") {
      if (!isSafeRelativePath(downloadTo)) {
        return new Err("Error:PortableApps payload download path is unsafe");
      }
      destination = { type: "download", to: downloadTo };
    } else if (
      typeof extractTo === "string" &&
      typeof extractFilter === "string"
    ) {
      if (!isSafeRelativePath(extractTo)) {
        return new Err("Error:PortableApps payload extraction path is unsafe");
      }
      if (extractFilter !== "*") {
        return new Err(
          "Error:PortableApps payload extraction filter is unsupported",
        );
      }
      destination = { type: "extract", to: extractTo, filter: extractFilter };
    } else {
      return new Err(
        "Error:PortableApps payload destination metadata is incomplete",
      );
    }

    downloads.push({
      downloadUrl,
      downloadFilename,
      downloadSha256: downloadSha256.toLowerCase(),
      destination,
    });
  }
  if (downloads.length === 0) {
    return new Err("Error:PortableApps installer has no declared downloads");
  }
  return new Ok(downloads);
}

async function downloadPayload(
  metadata: InstallerDownload,
  workshop: string,
): Promise<Result<string, string>> {
  const payloadPath = path.join(workshop, metadata.downloadFilename);
  const response = await robustGet(metadata.downloadUrl, {
    responseType: "stream",
  });
  if (response.err) return new Err(response.val);

  const payload = response.unwrap();
  if (!(payload instanceof Readable)) {
    return new Err(
      "Error:PortableApps payload response is not a readable stream",
    );
  }
  try {
    await pipeline(payload, fs.createWriteStream(payloadPath));
  } catch (error) {
    shell.rm("-f", payloadPath);
    return new Err(
      `Error:Can't download PortableApps payload: ${String(error)}`,
    );
  }
  return new Ok(payloadPath);
}

async function producePortableAppsOnline(
  p: ProducerParameters,
  options: PortableAppsOnlineOptions,
): Promise<Result<ProducerReturned, string>> {
  const { downloadedFile, workshop } = p;
  const installerPath = path.join(workshop, downloadedFile);
  const readyRelativePath = "_ready";
  const portableRelativePath = path.join(
    readyRelativePath,
    options.portableDirectory,
  );
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
    return new Err(
      `Error:${options.displayName} installer metadata file not found`,
    );
  }
  const downloadsResult = parseInstallerDownloads(
    fs.readFileSync(installerIniPath, "utf8"),
  );
  if (downloadsResult.err) return downloadsResult;
  const downloads = downloadsResult.unwrap();

  // 下载并校验在线安装器声明的全部原始载荷
  for (const download of downloads) {
    const payloadResult = await downloadPayload(download, workshop);
    if (payloadResult.err) return payloadResult;
    const payloadPath = payloadResult.unwrap();
    if (!(await checksum(payloadPath, "SHA256", download.downloadSha256))) {
      shell.rm("-f", payloadPath);
      return new Err(
        `Error:Can't validate ${options.displayName} payload, expect ${download.downloadSha256}`,
      );
    }

    if (download.destination.type === "extract") {
      const extracted = await release(
        payloadPath,
        download.destination.to,
        false,
        portableDir,
      );
      shell.rm("-f", payloadPath);
      if (!extracted) {
        return new Err(`Error:Can't release ${options.displayName} payload`);
      }
    } else {
      const destinationDir = path.join(portableDir, download.destination.to);
      shell.mkdir("-p", destinationDir);
      shell.mv(
        payloadPath,
        path.join(destinationDir, download.downloadFilename),
      );
    }
  }
  shell.rm("-f", installerPath);

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

  const executablePath = options.executableRelativePath
    ? path.join(portableDir, options.executableRelativePath)
    : undefined;
  const requiredFiles = [path.join(portableDir, options.portableLauncher)];
  if (executablePath) requiredFiles.push(executablePath);
  for (const requiredFile of requiredFiles) {
    if (!fs.existsSync(requiredFile)) {
      return new Err(
        `Error:${options.displayName} produced file not found: ${requiredFile}`,
      );
    }
  }
  if (executablePath && options.requiredMachine !== undefined) {
    const machineResult = getPeMachine(fs.readFileSync(executablePath));
    if (machineResult.err) return machineResult;
    if (machineResult.unwrap() !== options.requiredMachine) {
      return new Err(
        `Error:${options.displayName} produced executable has an unexpected machine type`,
      );
    }
  }

  // Return ready directory
  return new Ok({
    readyRelativePath,
  });
}

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  return producePortableAppsOnline(p, {
    displayName: "Chrome",
    portableDirectory: "GoogleChromePortable64",
    portableLauncher: "GoogleChromePortable.exe",
    executableRelativePath: "App/Chrome-bin/chrome.exe",
    requiredMachine: IMAGE_FILE_MACHINE_AMD64,
  });
}

export {
  getPeMachine,
  IMAGE_FILE_MACHINE_AMD64,
  parseInstallerDownloads,
  producePortableAppsOnline,
};
