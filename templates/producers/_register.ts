import {ProducerRegister} from '../../src/class';

const regArray: Array<ProducerRegister> = [
	{
		name: 'Click to Install',
		entrance: 'Click2Install',
		description: 'Create a shortcut on the desktop to allow user\'s manually install or click to run;' +
			'\nSuggested buildManifest : [\'${taskName}.wcs\',\'${taskName}/${downloadedFile}\']',
		defaultCompressLevel: 1,
	},
	{
		name: 'Recursive Unzip',
		entrance: 'Recursive_Unzip',
		description: 'Recursive unzip downloaded file by array "recursiveUnzipList", then create a shortcut on the desktop for "sourceFile";' +
			'\nSuggested buildManifest : [\'${taskName}.wcs\',"sourceFile"]',
		defaultCompressLevel: 1,
	},
];

export default regArray;
