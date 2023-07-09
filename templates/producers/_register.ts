import { ProducerRegister } from "../../src/types/class";

const regArray: Array<ProducerRegister> = [
  {
    name: "Click to Install",
    entrance: "Click2Install",
    description:
      "Create a shortcut on the desktop to allow user's manually install or click to run",
    defaultCompressLevel: 1,
    recommendedManifest: [
      "workflows/setup.toml",
      "${taskName}/${downloadedFile}",
    ],
  },
  {
    name: "Recursive Unzip",
    entrance: "Recursive_Unzip",
    description:
      'Recursive unzip downloaded file by array "recursiveUnzipList", then create a shortcut on the desktop for "sourceFile";' +
      '\nSuggested buildManifest : workflows/setup.toml,${taskName}/"sourceFile"',
    defaultCompressLevel: 5,
  },
  {
    name: "Silent Install",
    entrance: "Silent_Install",
    description:
      'Execute downloaded file with argument (default "/S", can be specified by "producer_required.argument")',
    defaultCompressLevel: 1,
    recommendedManifest: [
      "workflows/setup.toml",
      "${taskName}/${downloadedFile}",
    ],
  },
  {
    name: "PortableApps",
    entrance: "PortableApps",
    description: "Special designed for PortableApps",
    defaultCompressLevel: 5,
  },
];

export default regArray;
