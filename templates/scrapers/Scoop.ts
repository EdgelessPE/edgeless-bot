import {Ok, Err, Result} from 'ts-results';
import {ScraperParameters, ScraperReturned} from '../../src/class';
import {robustGet} from '../../src/network';
import {log} from '../../src/utils'

interface Temp {
	bucketName: string
}

const Buckets: Map<string, string> = new Map([
	["Main", "https://raw.githubusercontent.com/ScoopInstaller/Main/master/bucket/"],
	["Extras", "https://raw.githubusercontent.com/ScoopInstaller/Extras/master/bucket/"],
	["games", "https://raw.githubusercontent.com/Calinou/scoop-games/master/bucket/"],
	["java", "https://raw.githubusercontent.com/ScoopInstaller/Java/master/bucket/"],
	["nirsoft", "https://raw.githubusercontent.com/kodybrown/scoop-nirsoft/master/bucket/"]
])

export default async function (p: ScraperParameters): Promise<Result<ScraperReturned, string>> {
	const {taskName, scraper_temp} = p;
	const temp: Temp = scraper_temp;
	const bucketName: string = temp.bucketName;
	const bucketUrl: string | undefined = Buckets.get(bucketName)
	if (!bucketUrl){
		return Err(`Error: Could not Get bucket ${bucketName}, please make sure bucketName is one of Main/Extras/games/java/nirsoft`)
	}
	const response = (await robustGet(`${bucketUrl}${taskName}.json`, {responseType: 'json'})).unwrap();
	log(`Info: downloadLink:${response['architecture']?.['64bit']["url"] ?? response["url"]}`)
	log(`Info: Version: ${response['version']}`)
	return new Ok({
		version: response['version'],
		downloadLink: response['architecture']?.['64bit']["url"] ?? response["url"]
	});
}
