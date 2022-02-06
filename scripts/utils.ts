import fs from 'fs';
import path from 'path';
import readline from 'readline';
import chalk from 'chalk';
import {PROJECT_ROOT} from '../src/const';

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

async function input(tip: string, defaultVal?: string): Promise<string> {
	let r = await ask(tip + (defaultVal ? chalk.yellowBright(`(${defaultVal})`) : ''));
	if (r == '') {
		if (defaultVal) {
			r = defaultVal;
		} else {
			console.log(chalk.red('Error ') + 'Please input value');
			r = await input(tip, defaultVal);
		}
	}
	return r;
}

async function select(tip: string, options: string[], defaultIndex?: number): Promise<string> {
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
				resolve(options[defaultIndex - 1]);
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
			resolve(options[Number(r) - 1]);
			return;
		}
	}));
}

async function bool(tip: string, defaultVal?: boolean): Promise<boolean> {
	console.log(tip);
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

export {
	input,
	select,
	bool,
};