import fs from 'fs';
import path from 'path';
import readline from 'readline';
import chalk from 'chalk';
import {PROJECT_ROOT} from '../src/const';
import {log} from '../src/utils';
import {Err, Ok, Result} from 'ts-results';
import {TaskInput} from './new';

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

async function ask(tip: string, head?: string): Promise<string> {
	return new Promise((resolve => {
		rl.question((head ?? chalk.blue('Question ')) + tip + chalk.gray(' > '), (answer) => {
			resolve(answer);
			return;
		});
	}));
}

async function input(tip: string, defaultVal?: string, regex?: RegExp): Promise<string> {
	let r = await ask(tip + (defaultVal ? chalk.yellowBright(`(${defaultVal})`) : ''));
	if (r == '') {
		//允许缺省
		//空值且未定义缺省值，或是未通过正则校验
		if (defaultVal == undefined) {
			console.log(chalk.red('Error ') + 'Please input value');
			r = await input(tip, defaultVal, regex);
		} else {
			r = defaultVal;
		}
	}
	if (regex != undefined && r.match(regex) == null) {
		console.log(chalk.red('Error ') + `Please input valid value matching ${regex}`);
		r = await input(tip, defaultVal, regex);
	}
	return r;
}

async function select(tip: string, options: string[], defaultIndex?: number): Promise<number> {
	return new Promise((async (resolve, reject) => {
		if (defaultIndex != undefined && (defaultIndex < 1 || defaultIndex > options.length)) {
			reject(`Error:Given default index (${defaultIndex}) out of range (1-${options.length})`);
			return;
		}
		console.log(chalk.blue('Question ') + tip);
		options.forEach((item, index) => {
			console.log(chalk.yellow((index + 1) + '. ') + item + ((defaultIndex && defaultIndex - 1 == index) ? chalk.yellowBright('	(default)') : ''));
		});
		console.log('');
		let r = await ask('Input index' + (defaultIndex ? chalk.yellowBright(` (${defaultIndex})`) : ''), '');
		//处理空输入
		if (r == '') {
			if (defaultIndex) {
				resolve(defaultIndex - 1);
				return;
			} else {
				console.log(chalk.red('Error ') + 'Please input index');
				resolve(await select(tip, options, defaultIndex));
				return;
			}
		}
		//校验输入
		if (r.match(/^[0-9]+$/) == null) {
			console.log(chalk.red('Error ') + `Invalid input, please input index (1-${options.length})`);
			resolve(await select(tip, options, defaultIndex));
			return;
		} else if (Number(r) < 1 || Number(r) > options.length) {
			console.log(chalk.red('Error ') + `Input out of range, please input index (1-${options.length})`);
			resolve(await select(tip, options, defaultIndex));
			return;
		} else {
			resolve(Number(r) - 1);
			return;
		}
	}));
}

async function bool(tip: string, defaultVal?: boolean): Promise<boolean> {
	let r = await ask(tip + ` (${defaultVal === true ? chalk.yellowBright('default ') : ''}y/${defaultVal === false ? chalk.yellowBright('default ') : ''}n)`);

	//处理使用默认值
	if (r == '' && defaultVal != undefined) {
		return defaultVal;
	}

	//处理y/n
	if (r.toLocaleLowerCase() == 'y') {
		return true;
	}
	if (r.toLocaleLowerCase() == 'n') {
		return false;
	}

	//处理输入错误
	console.log(chalk.red('Error ') + 'Please input \'y\' or \'n\'');
	return bool(tip, defaultVal);
}

function applyInput(toml: string, input: any, base: string): Result<string, string> {
	let val,
		suc = true,
		reason = 'Success',
		searchString;
	//应用用户输入
	for (let key in input) {
		val = input[key];
		if (typeof val == 'object' && !(val instanceof Array)) {
			toml = applyInput(toml, val, base + key + '.').unwrap();
		} else {
			searchString = '${' + base + key + '}';
			if (!toml.includes(searchString)) {
				suc = false;
				reason = `Error:Can't find ${searchString} to replace with ${val}`;
				break;
			}
			//单独处理数组
			if (val instanceof Array) {
				toml = toml.replace(searchString, JSON.stringify(val));
			} else {
				toml = toml.replace(searchString, val);
			}
		}
	}
	if (!suc) {
		return new Err(reason);
	} else {
		return new Ok(toml);
	}
}

export {
	input,
	select,
	bool,
	applyInput,
};