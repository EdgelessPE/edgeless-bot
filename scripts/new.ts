import {bool, select, input, applyInput} from './utils';
import {log} from '../src/utils';
import {TaskConfig} from '../src/task';
import chalk from 'chalk';
import {CATEGORIES} from '../src/const';
import fs from 'fs';
import producerRegister from '../templates/producers/_register';
import path from 'path';
const TOML = require('@iarna/toml')

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

type SchemaType="string"|"array"|"integer"|"object"

interface Schema {
	properties:{
		[key:string]:{
			type:SchemaType
		}
	},
	required:string[]
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
	let producerEntrance=""
	const inputProducer=async ()=>{
		let index=await select('制作器模板', (() => {
			let r: string[] = [];
			producerRegister.forEach((item) => {
				r.push(chalk.bgBlueBright('name') + ' ' + item.name
					+ '\n' + chalk.bgCyanBright('description') + ' ' + item.description,
				);
			});
			return r;
		})())
		producerEntrance=producerRegister[index].entrance
		return producerEntrance
	}
	const generateProducerRequired=async ():Promise<string>=>{
		const schemaFilePath = path.join('./schema/producer_templates', producerEntrance + '.json')
		const schemaJson=JSON.parse(fs.readFileSync(schemaFilePath).toString()) as Schema
		let t:SchemaType,resJson:any={},tmp
		for(let key of schemaJson.required){
			t=schemaJson.properties[key].type
			switch (t) {
				case 'array':
					tmp=await input(`自动制作模板要求的${chalk.cyan("数组")}参数：${key},使用 ' 包裹单个元素,使用 , 分割,不需要加中括号`,"",/('[^',]+'\s*,)*\s*('[^',]+')+/)
					resJson[key]=tmp.replace(/'/g,"").split(",")
					break
				case 'integer':
					resJson[key]=Number(await input(`自动制作模板要求的${chalk.cyan("整数")}参数：${key}`,undefined,/^[0-9]+$/))
					break
				case 'object':
					if(resJson["producer_required"]==undefined) resJson["producer_required"]={}
					tmp=await input(`自动制作模板要求的${chalk.cyan("对象")}参数：${key},需要加花括号`,undefined,/{.*}/)
					try{
						resJson["producer_required"][key]=JSON.parse(tmp)
					}catch (e) {
						console.log(JSON.stringify(e,null,2));
						log("Error:Can't parse input as object, please modify toml config later manually")
						resJson["producer_required"][key]={}
					}
					break
				case 'string':
					resJson[key]=await input(`自动制作模板要求的${chalk.cyan("字符串")}参数：${key}`)
					break
				default:
					log(`Error:Unimplemented type ${t}, please modify toml config later manually`)
					resJson[key]=""

			}
		}
		return TOML.stringify(resJson)
	}
	let json = {
		task:{
			name:await input("任务名称"),
			category:CATEGORIES[await select("任务分类",CATEGORIES)],
			author:await input("作者"),
			url:await input("上游URL",undefined,/^https?:\/\//)
		},
		template: {
			producer: await inputProducer(),
		},
		regex:{
			download_name:await input("下载文件校验正则","/.exe/",/^\/.+\/$/)
		},
		parameter:{
			build_manifest:await input("构建装箱单,使用 ' 包裹单个文件，使用 , 分割	","'${taskName}.wcs','${taskName}'",/('[^',]+'\s*,)*\s*('[^',]+')+/)
		},
		producer_required:await generateProducerRequired()
	};
	let taskToml = fs.readFileSync('./scripts/templates/task.toml').toString();
	console.log(applyInput(taskToml, json, '').unwrap());
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