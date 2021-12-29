import {ScraperRegister} from "../../class";
import GitHub_Release from "./GitHub_Release"

const regArray: Array<ScraperRegister> = [
    {
        name: "GitHub Release",
        entrance: GitHub_Release,
        urlRegex: "https?://github.com/[^/]+/[^/]+",
        requiredKeys: []
    }
]

export default regArray
