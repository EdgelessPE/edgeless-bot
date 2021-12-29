import {ScraperRegister} from "../../class";
import GitHub_Release from "./GitHub_Release"
import External_Scraper from "./External_Scraper";

const regArray: Array<ScraperRegister> = [
    {
        name: "External Scraper",
        entrance: External_Scraper,
        urlRegex: "external_scraper://.+",
        requiredKeys: []
    },
    {
        name: "GitHub Release",
        entrance: GitHub_Release,
        urlRegex: "https?://github.com/[^/]+/[^/]+",
        requiredKeys: []
    },
]

export default regArray
