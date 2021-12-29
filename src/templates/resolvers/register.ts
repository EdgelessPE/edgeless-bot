import {ResolverRegister} from "../../class";
import GitHub_Release from "./GitHub_Release"

const regArray: Array<ResolverRegister> = [
    {
        name: "GitHub Release",
        entrance: GitHub_Release,
        downloadLinkRegex: "https?://api.github.com/repos/[^/]+/[^/]+/releases",
        requiredKeys: []
    }
]

export default regArray
