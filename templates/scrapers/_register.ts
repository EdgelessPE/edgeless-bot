import {ScraperRegister} from '../../src/class';

const regArray: Array<ScraperRegister> = [
  {
    name: 'GitHub Release',
    entrance: 'GitHub_Release',
    urlRegex: 'https?://github.com/[^/]+/[^/]+',
    requiredKeys: [],
  },
  {
    name: 't',
    entrance: 'i',
    urlRegex: 'http://localhost',
    requiredKeys: [],
  },
];

export default regArray;
