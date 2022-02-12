import {ScraperRegister} from '../../src/class';

const regArray: Array<ScraperRegister> = [
  {
    name: "GitHub Release",
    entrance: "GitHub_Release",
    urlRegex: "https?://github.com/[^/]+/[^/]+",
    requiredKeys: [],
  },
  {
    name: "Portable Apps",
    entrance: "PortableApps",
    urlRegex: "https?://portableapps.com/apps/\\S+",
    requiredKeys: [],
  },
  {
    name: 'Global Page Match',
    entrance: 'Global_Page_Match',
    urlRegex: 'universal://',
    requiredKeys: [],
    description: 'Use given regex to match text in html file, narrow the scope by specify jQuery selector in "scraper_temp.download_selector" "scraper_temp.version_selector"',
  },
  {
    name: 'REST API',
    entrance: 'REST_API',
    urlRegex: 'universal://',
    requiredKeys: [
      'scraper_temp.api_url',
      'scraper_temp.version_path',
      'scraper_temp.download_path',
    ],
    description:
        'Specify Json REST api url by "scraper_temp.api_url", and specify object path by "scraper_temp.version_path" "scraper_temp.download_path"',
  },
  {
    name: 'Redirection Parse',
    entrance: 'Redirection_Parse',
    urlRegex: 'universal://',
    requiredKeys: ['scraper_temp.redirection_url'],
    description:
        'Parse redirection url to resolve version and direct download link, specify url by "scraper_temp.redirection_url"',
  },
];

export default regArray;
