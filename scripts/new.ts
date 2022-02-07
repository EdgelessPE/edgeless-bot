import {applyInput, bool, input, select, stringArray} from './utils';
import {log} from '../src/utils';
import {TaskConfig} from '../src/task';
import chalk from 'chalk';
import {CATEGORIES, PROJECT_ROOT} from '../src/const';
import fs from 'fs';
import producerRegister from '../templates/producers/_register';
import path from 'path';
import {config} from '../src/config';
import {_, init} from '../i18n/i18n';
import scraperRegister from '../templates/scrapers/_register';

const TOML = require('@iarna/toml');
const shell = require('shelljs');

export interface TaskInput {
	task: TaskConfig['task'],
	template: {
		producer: TaskConfig['template']['producer']
		scraper?: TaskConfig['template']['scraper']
	},
	regex: {
		download_name: TaskConfig['regex']['download_name']
	},
	parameter: {
		build_manifest: TaskConfig['parameter']['build_manifest']
	},
	producer_required: any
}

type SchemaType = 'string' | 'array' | 'integer' | 'object'

interface Schema {
	properties: {
		[key: string]: {
			type: SchemaType
		}
	},
	required: string[]
}

function printHelp() {
	//展示帮助信息
	console.log('');
	console.log(chalk.blue(_('Usage ')) + 'yarn new [task/template]');
	console.log('');
	console.log(_('Create new task or template for Edgeless Bot'));
	console.log('');
}

async function createTask() {
	let producerEntrance = '',
		taskName = await input(_('Task name'));
	//创建任务文件夹
	const taskDir = path.join(PROJECT_ROOT, config.DIR_TASKS, taskName),
		configPath = path.join(taskDir, 'config.toml');
	shell.mkdir('-p', taskDir);

	//用于输入template.producer
	const inputProducer = async () => {
		let index = await select(_('Producer template'), (() => {
			let r: string[] = [];
			producerRegister.forEach((item) => {
				r.push(_(item.name) + '\n' + _(item.description),
				);
			});
			r.push(_("External")+"\n"+_("Use your own 'producer.ts' script to produce"));
			return r;
		})());
		//处理选择External的情况
		if (index == producerRegister.length) {
			//复制模板
			shell.cp('./scripts/templates/taskProducer.ts', path.join(taskDir, 'producer.ts'));
			producerEntrance = 'External';
			return producerEntrance;
		}
		producerEntrance = producerRegister[index].entrance;
		return producerEntrance;
	};

	//用于输入producer_required
	const generateProducerRequired = async (): Promise<string> => {
		//处理External情况
		if (producerEntrance == 'External') {
			return '';
		}
		const schemaFilePath = path.join('./schema/producer_templates', producerEntrance + '.json');
		const schemaJson = JSON.parse(fs.readFileSync(schemaFilePath).toString()) as Schema;
		let t: SchemaType,
			resJson: any = {},
			tmp: string;
		for (let key of schemaJson.required) {
			t = schemaJson.properties[key].type;
			switch (t) {
				case 'array':
					resJson[key] = await stringArray(`${_("Producer required ")}${chalk.cyan(_('array'))}${_(" parameter")}：${key}, ${_("split with ,")}`)
					break;
				case 'integer':
					resJson[key] = Number(await input(`${_("Producer required ")}${chalk.cyan(_('integer'))}${_(" parameter")}：${key}`, undefined, /^[0-9]+$/));
					break;
				case 'object':
					if (resJson['producer_required'] == undefined) {
						resJson['producer_required'] = {};
					}
					tmp = await input(`${_("Producer required ")}${chalk.cyan(_('object'))}${_(" parameter")}：${key},${_("input Json string contained by {}")}`, undefined, /{.*}/);
					try {
						resJson['producer_required'][key] = JSON.parse(tmp);
					} catch (e) {
						console.log(JSON.stringify(e, null, 2));
						log('Error:Can\'t parse input as object, please modify toml config later manually');
						resJson['producer_required'][key] = {};
					}
					break;
				case 'string':
					resJson[key] = await input(`${_("Producer required ")}${chalk.cyan(_('string'))}${_(" parameter")}：${key}`);
					break;
				default:
					log(`Error:Unimplemented type ${t}, please modify toml config later manually`);
					resJson[key] = '';

			}
		}
		return TOML.stringify(resJson);
	};

	//用于输入上游URL并进行校验
	let externalScraper=true
	const inputUpstreamUrl=async ():Promise<string>=>{
		//要求输入上游URL
		let url=await input(_('Upstream URL'), taskName=="1"?"https://github.com/balena-io/etcher":undefined, /^https?:\/\/\S+/)
		//检索对应的模板
		for(let node of scraperRegister){
			if(url.match(node.urlRegex)!=null){
				console.log(chalk.blueBright(_("Info "))+_("Matched scraper template ")+chalk.cyanBright(_(node.name)));
				externalScraper=false
				break;
			}
		}
		//处理未找到爬虫模板，可能需要外置的情况
		if(externalScraper){
			//询问是否需要外置scraper
			if (await bool(_('No scraper template matched, use external scraper?'), true)) {
				shell.cp('./scripts/templates/taskScraper.ts', path.join(taskDir, 'scraper.ts'));
			} else {
				externalScraper=false
			}
		}
		return url
	}

	//构成基础json
	let json: TaskInput = {
		task: {
			name: taskName,
			category: CATEGORIES[await select(_('Task category'), CATEGORIES)],
			author: await input(_('Author')),
			url:await inputUpstreamUrl(),
		},
		template: {
			producer: await inputProducer(),
			scraper:externalScraper?'scraper = "External"':'# scraper = ""'
		},
		regex: {
			download_name: await input(_('Regex for downloaded file'), '/.exe/', /^\/.+\/$/),
		},
		parameter: {
			build_manifest: await stringArray(_('Build manifest, split file name with ,'), ['${taskName}.wcs','${taskName}']),
		},
		producer_required: await generateProducerRequired(),
	};

	//修改toml并写入配置
	//console.log(JSON.stringify(json,null,2));
	let taskToml = fs.readFileSync('./scripts/templates/task.toml').toString();
	fs.writeFileSync(configPath, applyInput(taskToml, json, '').unwrap());
	console.log(chalk.green(_("Success "))+_("Task config saved at ")+chalk.cyanBright(configPath)+", "+_('you may need to modify it manually later'));
}

async function createTemplate() {

}

async function main() {
	//初始化i18n
	init()
	//处理参数过少
	if (process.argv.length < 3) {
		printHelp();
		return;
	}
	switch (process.argv[2]) {
		case 'task':
			await createTask();
			break;
		case 'template':
			await createTemplate();
			break;
		default:
			log(`Error:Unknown argument '${process.argv[2]}'`);
			printHelp();
			break;
	}
}

async function test() {
	//console.log(await input("输入项目名称","Test"));
	//console.log(await select("选择模板",["Click2Install","RecRelease","GlobalMatch"],2));
	//console.log(await bool("确认继续？",true));
}

main().then(_ => {
	process.exit(0);
});