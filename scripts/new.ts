import {bool, select, input, applyInput} from './utils';
import {log} from '../src/utils';
import {TaskConfig} from '../src/task';
import chalk from 'chalk';
import {CATEGORIES} from '../src/const';
import fs from 'fs';
import producerRegister from '../templates/producers/_register';

interface TaskInput {
	task: TaskConfig['task'],
	template: {
		producer: TaskConfig['template']['producer']
	},
	regex: {
		download_name: TaskConfig['regex']['download_name']
	},
	parameter: {
		build_manifest: TaskConfig['parameter']['build_manifest']
	},
	producer_required: any
}

function printHelp() {
	//展示帮助信息
	console.log('');
	console.log(chalk.blue('Usage	') + 'yarn new [task/template]');
	console.log('');
	console.log('Create new task or template for Edgeless Bot');
	console.log('');
}

async function createTask() {
	let json = {
		// task:{
		// 	name:await input("任务名称"),
		// 	category:CATEGORIES[await select("任务分类",CATEGORIES)],
		// 	author:await input("作者"),
		// 	url:await input("上游URL",undefined,/^https?:\/\//)
		// },
		template: {
			producer: producerRegister[await select('制作器模板', (() => {
				let r: string[] = [];
				producerRegister.forEach((item) => {
					r.push(chalk.bgBlueBright('name') + ' ' + item.name
						+ '\n' + chalk.bgCyanBright('description') + ' ' + item.description,
					);
				});
				return r;
			})())].entrance,
		},
	};
	let toml = fs.readFileSync('./scripts/templates/task.toml').toString();
	console.log(applyInput(toml, json, '').unwrap());
}

async function createTemplate() {

}

async function main() {
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