import {ResolverParameters, ResolverReturned} from '../../src/class';
import {Err, Ok, Result} from 'ts-results';
import {robustGet} from '../../src/network';

export default async function (p: ResolverParameters): Promise<Result<ResolverReturned, string>> {

	//YOUR CODE HERE

	return new Ok({
		directLink: 'http://localhost/file.exe',
	});
}
