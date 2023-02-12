import { ResolverRegister } from "../../src/types/class";

const regArray: Array<ResolverRegister> = [
  {
    name: "GitHub Release",
    entrance: "GitHub_Release",
    downloadLinkRegex: "https?://api.github.com/repos/[^/]+/[^/]+/releases",
    requiredKeys: [],
  },
];

export default regArray;
