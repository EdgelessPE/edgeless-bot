import {ScraperRegister} from "../../src/class";

const regArray: Array<ScraperRegister> = [
    {
        name: "GitHub Release",
        entrance: "GitHub_Release",
        urlRegex: "https?://github.com/[^/]+/[^/]+",
        requiredKeys: []
    }
]

export default regArray
