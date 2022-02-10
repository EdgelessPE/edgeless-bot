import {ResolverRegister} from '../../src/class';

const regArray: Array<ResolverRegister> = [
  {
    name: 'GitHub Release',
    entrance: 'GitHub_Release',
    downloadLinkRegex: 'https?://api.github.com/repos/[^/]+/[^/]+/releases',
    requiredKeys: [],
  },
  {
    name: 'Ctfile',
    entrance: 'Ctfile',
    downloadLinkRegex: 'universal://',
    requiredKeys: [],
  },
];

export default regArray;
