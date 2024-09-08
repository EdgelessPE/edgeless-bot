import { ProducerParameters, ProducerReturned } from "../../src/types/class";
import { Err, Ok, Result } from "ts-results";
import path from "path";
import fs from "fs";

import shell from "shelljs";
import { NepWorkflow } from "../../src/types/nep";
import { tomlStringify } from "../../src/utils";

interface RequiredObject {
  argument?: string;
  deleteInstaller?: boolean;
  uninstallCmd?: string;
  ignoreInstallCmdExitCode?: boolean;
  ignoreUninstallCmdExitCode?: boolean;
}

export default async function (
  p: ProducerParameters,
): Promise<Result<ProducerReturned, string>> {
  const { taskName, downloadedFile, workshop } = p;
  const obj = p.requiredObject as RequiredObject;
  const arg = obj.argument ?? "/S";
  // const del = obj.deleteInstaller ?? false;

  const readyPath = path.join(workshop, "_ready"),
    workflow = path.join(readyPath, "workflows"),
    setupPath = path.join(workflow, "setup.toml"),
    removePath = path.join(workflow, "remove.toml"),
    fileDir = path.join(readyPath, taskName);
  shell.mkdir("-p", fileDir);
  shell.cp(path.join(workshop, downloadedFile), fileDir + "/");

  shell.mkdir("-p", workflow);

  // let text = `EXEC =! %ProgramFiles%\\Edgeless\\${taskName}\\${downloadedFile} ${arg}`;
  // if (del) {
  //   text += `\nFILE %ProgramFiles%\\Edgeless\\${taskName}\\${downloadedFile}`;
  // }

  const setupWorkflow: NepWorkflow = {
    run_installer: {
      name: "Run Installer",
      step: "Execute",
      command: `${downloadedFile} ${arg}`,
      call_installer: true,
      ignore_exit_code: obj.ignoreInstallCmdExitCode ?? undefined,
    },
  };
  // TODO:等待 File 步骤上线后实现 del 特性
  fs.writeFileSync(setupPath, tomlStringify(setupWorkflow));

  // 写卸载流
  if (obj.uninstallCmd) {
    if (
      !(obj.uninstallCmd.startsWith("${") || obj.uninstallCmd.startsWith('"${'))
    ) {
      return new Err(
        `Error:Invalid uninstallCmd '${obj.uninstallCmd}' : should starts with inner value, e.g. '\${AppData}/Local/Programs/Microsoft VS Code/unins000.exe'`,
      );
    }
    const removeWorkflow: NepWorkflow = {
      run_uninstaller: {
        name: "Run Uninstaller",
        step: "Execute",
        command: obj.uninstallCmd,
        call_installer: true,
        ignore_exit_code: obj.ignoreUninstallCmdExitCode ?? undefined,
      },
    };
    fs.writeFileSync(removePath, tomlStringify(removeWorkflow));
  }

  if (
    fs.existsSync(setupPath) &&
    fs.existsSync(path.join(fileDir, downloadedFile))
  ) {
    return new Ok({
      readyRelativePath: "_ready",
      flags: ["I"],
      expandableContext: {
        downloadedFilePath: path.join(fileDir, downloadedFile),
      },
    });
  } else {
    return new Err(
      "Error:Silent_Install self check failed due to file missing in ready folder",
    );
  }
}
