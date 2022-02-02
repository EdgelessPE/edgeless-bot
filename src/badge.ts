import chalk from 'chalk';

const base = Math.floor(Math.random() * 14);
let count = 0;

export function getBadge(type: string): string {
	let res;
	switch ((base + count) % 14) {
		case 0:
			res = chalk.bgRed(type + ' ' + count);
			break;
		case 1:
			res = chalk.bgGreen(type + ' ' + count);
			break;
		case 2:
			res = chalk.bgYellow(type + ' ' + count);
			break;
		case 3:
			res = chalk.bgBlue(type + ' ' + count);
			break;
		case 4:
			res = chalk.bgMagenta(type + ' ' + count);
			break;
		case 5:
			res = chalk.bgCyan(type + ' ' + count);
			break;
		case 6:
			res = chalk.bgWhite(type + ' ' + count);
			break;
		case 7:
			res = chalk.bgGray(type + ' ' + count);
			break;
		case 8:
			res = chalk.bgRedBright(type + ' ' + count);
			break;
		case 9:
			res = chalk.bgGreenBright(type + ' ' + count);
			break;
		case 10:
			res = chalk.bgYellowBright(type + ' ' + count);
			break;
		case 11:
			res = chalk.bgBlueBright(type + ' ' + count);
			break;
		case 12:
			res = chalk.bgMagentaBright(type + ' ' + count);
			break;
		case 13:
			res = chalk.bgCyanBright(type + ' ' + count);
			break;
		default:
			res = chalk.bgWhiteBright(type + ' ' + count);
			break;
	}
	count++;
	return res;
}
