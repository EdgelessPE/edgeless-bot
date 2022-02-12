import {ResolverParameters, ResolverReturned} from '../../src/class';
import {Ok, Result} from 'ts-results';
import {robustGet} from '../../src/network';
import {log} from '../../src/utils';

export default async function (p: ResolverParameters): Promise<Result<ResolverReturned, string>> {
	const {downloadLink, password, cd, fileMatchRegex} = p;

	//YOUR CODE HERE

	return new Ok({
		directLink: 'http://localhost/file.exe',
	});
}
