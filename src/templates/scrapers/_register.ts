import {ScraperRegister} from "../../class";

const regArray: Array<ScraperRegister> = [
    {
        name: "External Scraper",
        entrance: "External_Scraper",
        urlRegex: "external_scraper://.+",
        requiredKeys: []
    },
    {
        name: "GitHub Release",
        entrance: "GitHub_Release",
        urlRegex: "https?://github.com/[^/]+/[^/]+",
        requiredKeys: []
    },
]

export default regArray
