import { ResolverRegister } from "../../src/class";

const regArray: Array<ResolverRegister> = [
  {
    name: "GitHub Release",
    entrance: "GitHub_Release",
    downloadLinkRegex: "https?://api.github.com/repos/[^/]+/[^/]+/releases",
    requiredKeys: [],
  },
  {
    name: "Lanzou",
    entrance: "lanzou",
    downloadLinkRegex: "lanzou\\w\\.com",
    requiredKeys: [],
  },
  {
    name: "SourceForge",
    entrance: "SourceForge",
    downloadLinkRegex: "sourceforge.net/projects/",
    requiredKeys: [],
  },
];

export default regArray;
