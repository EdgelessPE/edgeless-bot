import {ScraperRegister} from "../../class";

const regArray: Array<ScraperRegister> = [
    {
        name: "GitHub Release",
        entrance: "GitHub_Release",
        urlRegex: "https?://github.com/[^/]+/[^/]+",
        requiredKeys: []
    }
]

export default regArray
