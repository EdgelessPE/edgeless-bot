import chalk from "chalk";

const choices = [
  chalk.bgRed,
  chalk.bgGreen,
  chalk.bgYellow,
  chalk.bgBlue,
  chalk.bgMagenta,
  chalk.bgCyan,
  chalk.bgWhite,
  chalk.bgGray,
  chalk.bgRedBright,
  chalk.bgGreenBright,
  chalk.bgYellowBright,
  chalk.bgBlueBright,
  chalk.bgMagentaBright,
  chalk.bgCyanBright,
];
const base = Math.floor(Math.random() * choices.length);
let count = 0;

export function getBadge(type: string): string {
  const res = (choices[(base + count) % choices.length] ?? chalk.bgWhiteBright)(
    `${type} ${count}`,
  );

  count++;

  return res;
}
