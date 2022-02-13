import {
	ProducerParameters,
	ProducerReturned,
	ResolverParameters,
	ResolverReturned,
	ScraperParameters,
	ScraperReturned,
	WorkerDataProducer,
	WorkerDataResolver,
	WorkerDataScraper,
} from './class';
import {Err, Ok, Result} from 'ts-results';
import {awaitWithTimeout} from './utils';
import {HEAVY_TIMEOUT, LIGHT_TIMEOUT, MISSING_VERSION_TRY_DAY} from './const';

require('source-map-support').install();

export let badge = 'Worker';

async function scraper(workerData: WorkerDataScraper): Promise<Result<Array<Result<ScraperReturned, string>>, string>> {
	//修改工作牌
	badge = workerData.badge;
	//执行脚本
	const dirtyScript = await import(workerData.scriptPath);
	if (dirtyScript == null || dirtyScript.default == null) {
		return new Err(`Error:Worker imported null script : ${workerData.scriptPath}`);
	} else {
		if (workerData.isExternal) {
			//作为外置脚本处理
			const script = dirtyScript.default as () => Promise<Result<ScraperReturned, string>>;
			let res: Result<ScraperReturned, string>;
			try {
				res = await awaitWithTimeout(script, LIGHT_TIMEOUT);
				//处理无版本号任务
				if (workerData.tasks[0].extra?.missing_version && res.ok) {
					//在指定的星期检查更新
					let date = new Date();
					if (date.getDay() == MISSING_VERSION_TRY_DAY) {
						res.val.version = '999999.99.99';
					} else {
						//其他时间将爬虫的版本号改为 0
						res.val.version = '0.0.0';
					}
				}
				return new Ok([res]);
			} catch (e) {
				return new Err(`Error:Worker executed script failed : \n${JSON.stringify(e)}`);
			}
		} else {
			//作为模板处理
			const script = dirtyScript.default as (p: ScraperParameters) => Promise<Result<ScraperReturned, string>>;
			let results: Array<Result<ScraperReturned, string>> = [];
			let res;
			for (let task of workerData.tasks) {
				try {
					res = (await awaitWithTimeout(script, LIGHT_TIMEOUT, {
						taskName: task.name,
						url: task.pageUrl,
						downloadLinkRegex: task.regex?.download_link,
						versionMatchRegex: task.regex?.scraper_version,
						scraper_temp: task.scraper_temp,
					})) as Result<ScraperReturned, string>;
					results.push(res);
				} catch (e) {
					results.push(new Err(`Error:Worker executed script failed : \n${JSON.stringify(e)}`));
				}
			}
			return new Ok(results);
		}
	}
}

async function resolver(workerData: WorkerDataResolver): Promise<Result<ResolverReturned, string>> {
	//修改工作牌
	badge = workerData.badge;
	//执行脚本
	const dirtyScript = await import(workerData.scriptPath);
	if (dirtyScript == null || dirtyScript.default == null) {
		return new Err(`Error:Worker imported null script : ${workerData.scriptPath}`);
	} else {
		const script = dirtyScript.default as (p: ResolverParameters) => Promise<Result<ResolverReturned, string>>;
		let res,
			url = workerData.url;
		try {
			res = (await awaitWithTimeout(script, LIGHT_TIMEOUT, {
				downloadLink: url,
				fileMatchRegex: workerData.fileMatchRegex,
				cd: workerData.cd,
				password: workerData.password,
			})) as Result<ResolverReturned, string>;
		} catch (e) {
			return new Err(`Error:Worker executed script failed : \n${JSON.stringify(e)}`);
		}
		return res;
	}
}

async function producer(workerData: WorkerDataProducer): Promise<Result<ProducerReturned, string>> {
	//修改工作牌
	badge = workerData.badge;
	//执行脚本
	const dirtyScript = await import(workerData.scriptPath);
	if (dirtyScript == null || dirtyScript.default == null) {
		return new Err(`Error:Worker imported null script : ${workerData.scriptPath}`);
	} else {
		if (workerData.isExternal) {
			//作为外置脚本处理
			const script = dirtyScript.default as (p: ProducerParameters) => Promise<Result<ProducerReturned, string>>;
			let res;
			try {
				res = (await awaitWithTimeout(script, HEAVY_TIMEOUT, workerData.task)) as Result<ProducerReturned, string>;
				return res;
			} catch (e) {
				return new Err(`Error:Worker executed script failed : \n${JSON.stringify(e)}`);
			}
		} else {
			//作为模板处理
			const script = dirtyScript.default as (p: ProducerParameters) => Promise<Result<ProducerReturned, string>>;
			let res;
			try {
				res = (await awaitWithTimeout(script, HEAVY_TIMEOUT, workerData.task)) as Result<ProducerReturned, string>;
			} catch (e) {
				return new Err(`Error:Worker executed script failed : \n${JSON.stringify(e)}`);
			}
			return res;
		}
	}
}

export {
	scraper,
	resolver,
	producer,
};
