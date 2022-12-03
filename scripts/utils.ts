import readline from "readline";
import chalk from "chalk";
import { Err, Ok, Result } from "ts-results";
import { t } from "../i18n/i18n";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function ask(tip: string, head?: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(
      (head ?? chalk.blue(t("Question "))) + t(tip) + chalk.gray(" > "),
      (answer) => {
        resolve(answer);
        return;
      }
    );
  });
}

async function input(
  tip: string,
  defaultVal?: string,
  regex?: RegExp
): Promise<string> {
  let r = await ask(
    tip + (defaultVal != undefined ? chalk.yellowBright(`(${defaultVal})`) : "")
  );
  if (r == "") {
    //允许缺省
    //空值且未定义缺省值，或是未通过正则校验
    if (defaultVal == undefined) {
      console.log(chalk.red(t("Error ")) + t("Please input value"));
      r = await input(tip, defaultVal, regex);
    } else {
      r = defaultVal;
    }
  }
  if (regex != undefined && r.match(regex) == null) {
    console.log(
      chalk.red(t("Error ")) + t("Please input valid value matching ") + regex
    );
    r = await input(tip, defaultVal, regex);
  }
  return r;
}

async function select(
  tip: string,
  options: string[],
  defaultIndex?: number
): Promise<number> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    if (
      defaultIndex != undefined &&
      (defaultIndex < 1 || defaultIndex > options.length)
    ) {
      reject(
        `Error:Given default index (${defaultIndex}) out of range (1-${options.length})`
      );
      return;
    }
    console.log(chalk.blue(t("Question ")) + tip);
    options.forEach((item, index) => {
      console.log(
        chalk.yellow(index + 1 + ". ") +
          item +
          (defaultIndex && defaultIndex - 1 == index
            ? chalk.yellowBright("	(" + t("default") + ")")
            : "")
      );
    });
    console.log("");
    const r = await ask(
      t("Input index") +
        (defaultIndex ? chalk.yellowBright(` (${defaultIndex})`) : ""),
      ""
    );
    //处理空输入
    if (r == "") {
      if (defaultIndex) {
        resolve(defaultIndex - 1);
        return;
      } else {
        console.log(chalk.red(t("Error ")) + t("Please input index"));
        resolve(await select(tip, options, defaultIndex));
        return;
      }
    }
    //校验输入
    if (r.match(/^[0-9]+$/) == null) {
      console.log(
        chalk.red(t("Error ")) +
          t("Invalid input, please input index") +
          ` (1-${options.length})`
      );
      resolve(await select(tip, options, defaultIndex));
      return;
    } else if (Number(r) < 1 || Number(r) > options.length) {
      console.log(
        chalk.red(t("Error ")) +
          t("Input out of range, please input index") +
          ` (1-${options.length})`
      );
      resolve(await select(tip, options, defaultIndex));
      return;
    } else {
      resolve(Number(r) - 1);
      return;
    }
  });
}

async function bool(tip: string, defaultVal?: boolean): Promise<boolean> {
  const r = await ask(
    tip +
      ` (${
        defaultVal === true ? chalk.yellowBright(t("default") + " ") : ""
      }y/${
        defaultVal === false ? chalk.yellowBright(t("default") + " ") : ""
      }n)`
  );

  //处理使用默认值
  if (r == "" && defaultVal != undefined) {
    return defaultVal;
  }

  //处理y/n
  if (r.toLocaleLowerCase() == "y") {
    return true;
  }
  if (r.toLocaleLowerCase() == "n") {
    return false;
  }

  //处理输入错误
  console.log(chalk.red(t("Error ")) + t("Please input 'y' or 'n'"));
  return bool(tip, defaultVal);
}

async function stringArray(
  tip: string,
  defaultVal?: string[],
  regex?: RegExp
): Promise<string[]> {
  let df = undefined;
  const allowEmpty = defaultVal != undefined && defaultVal.length == 0;

  //生成字符串型默认值
  if (defaultVal != undefined) {
    df = "";
    if (!allowEmpty) {
      for (const node of defaultVal) {
        df = df + node + ",";
      }
      df = df.slice(0, -1);
    }
  }

  //生成默认正则
  if (regex == undefined && !allowEmpty) {
    regex = /([^,]+\s*,)*\s*([^,]+)+/;
  }

  //调用input
  const r = await input(tip, df, regex);
  if (r == "") {
    return [];
  } else {
    return r.split(",");
  }
}

function applyInput(
  toml: string,
  input: any,
  base: string
): Result<string, string> {
  let val,
    suc = true,
    reason = "Success",
    searchString;
  //应用用户输入
  for (const key in input) {
    val = input[key];
    if (typeof val == "object" && !(val instanceof Array)) {
      toml = applyInput(toml, val, base + key + ".").unwrap();
    } else {
      searchString = "${ " + base + key + " }";
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

function genRegExpForToml(key: string): RegExp {
  return new RegExp(`#?\\s*\\[\\s*${key}\\s*\\]`);
}

//只能激活被注释的表头，不允许自行添加
function inputRequiredKey(
  keyChain: string,
  toml: string,
  value: string
): Result<string, string> {
  const p = keyChain.split(".");
  let replaceTitleWith = "";
  //匹配表头
  const m = toml.match(genRegExpForToml(p[0]));
  if (m == null) {
    return new Err(`Error:Toml title ${p[0]} undefined`);
  } else {
    //激活表头
    replaceTitleWith = `\n[${p[0]}]`;
  }
  //匹配键
  const m2 = toml.match(genRegExpForToml(p[1]));
  if (m2 == null) {
    //增加新键
    replaceTitleWith += `\n${p[1]} = "${value}"`;
  } else {
    //激活键
    toml = toml.replace(m2[0], `${p[1]} = "${value}"`);
  }
  //替换标题
  toml = toml.replace(m[0], replaceTitleWith);
  return new Ok(toml);
}

interface ParameterDeclare {
  type: string;
  key: string;
  title: string;
  description?: string;
}

//生成参数声明文档
function genParameterWiki(arr: ParameterDeclare[]): string {
  if (arr.length == 0) {
    return "无";
  } else {
    let r = "";
    for (const n of arr) {
      r += `### ${n.key}\n* 路径：\`${n.title}.${n.key}\`\n* 类型：\`${
        n.type
      }\`\n* 说明：${n.description ?? ""}\n`;
    }
    return r;
  }
}

export {
  input,
  select,
  bool,
  stringArray,
  applyInput,
  inputRequiredKey,
  genParameterWiki,
  ParameterDeclare,
};
