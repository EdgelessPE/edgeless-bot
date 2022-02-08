import {ScraperRegister} from '../../src/class';

const regArray: Array<ScraperRegister> = [
  {
    name: 'GitHub Release',
    entrance: 'GitHub_Release',
    urlRegex: 'https?://github.com/[^/]+/[^/]+',
    requiredKeys: [],
  },
  {
    name: 'Portable Apps',
    entrance: 'PortableApps',
    urlRegex: 'https?://portableapps.com/apps/\\S+',
    requiredKeys: [],
  },
  {
    name: 'Global Page Match',
    entrance: 'Global_Page_Match',
    urlRegex: 'universal://',
    requiredKeys: ['regex.scraper_version', 'regex.download_link'],
  },
];

export default regArray;
