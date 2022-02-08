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
];

export default regArray;
