import {
  applyInput,
  bool,
  genParameterWiki,
  input,
  inputRequiredKey,
  ParameterDeclare,
  select,
  stringArray,
} from "./utils";
import { log } from "../src/utils";
import { TaskConfig } from "../src/task";
import chalk from "chalk";
import { CATEGORIES, PROJECT_ROOT } from "../src/const";
import fs from "fs";
import path from "path";
import { config } from "../src/config";
import { _, init } from "../i18n/i18n";
import scraperRegister from "../templates/scrapers/_register";
import resolverRegister from "../templates/resolvers/_register";
import producerRegister from "../templates/producers/_register";
import {
  ProducerRegister,
  ResolverRegister,
  ScraperRegister,
} from "../src/class";
import { JSONSchema4 } from "json-schema";

const TOML = require("@iarna/toml");
const shell = require("shelljs");
const prettier = require("prettier");
const TEST_URL = "https://github.com/balena-io/etcher";

export interface TaskInput {
  task: TaskConfig["task"];
  template: {
    producer: TaskConfig["template"]["producer"];
    scraper?: TaskConfig["template"]["scraper"];
  };
  regex: {
    download_name: TaskConfig["regex"]["download_name"];
  };
  parameter: {
    build_manifest: TaskConfig["parameter"]["build_manifest"];
  };
  producer_required: any;
}

type SchemaType = "string" | "array" | "integer" | "object";

interface Schema {
  properties: {
    [key: string]: {
      description?: string;
      type: SchemaType;
    };
  };
  required?: string[];
}

function printHelp() {
  //展示帮助信息
  console.log("");
  console.log(chalk.blue(_("Usage ")) + "yarn new [task/template/wiki]");
  console.log("");
  console.log(_("Create new task / template / template wiki for Edgeless Bot"));
  console.log("");
}

async function createTask() {
  let producerEntrance = "",
    taskName = await input(_("Task name")),
    taskToml = fs.readFileSync("./scripts/templates/task.toml").toString();
  //创建任务文件夹
  const taskDir = path.join(PROJECT_ROOT, config.DIR_TASKS, taskName),
    configPath = path.join(taskDir, "config.toml");
  if (
    fs.existsSync(configPath) &&
    !(await bool(_("Already exist, overwrite?"), false))
  ) {
    return;
  }
  shell.mkdir("-p", taskDir);

  //用于输入template.producer
  let recommendedManifest = ["${taskName}.wcs", "${taskName}"];
  const inputProducer = async () => {
    const index = await select(
      _("Producer template"),
      (() => {
        const r: string[] = [];
        producerRegister.forEach((item) => {
          r.push(_(item.name) + "\n" + _(item.description));
        });
        r.push(
          _("External") +
            "\n" +
            _("Use your own 'producer.ts' script to produce")
        );
        return r;
      })()
    );
    //处理选择External的情况
    if (index == producerRegister.length) {
      //复制模板
      shell.cp(
        "./scripts/templates/taskProducer.ts",
        path.join(taskDir, "producer.ts")
      );
      producerEntrance = "External";
      return producerEntrance;
    }

    const chosenProducerNode = producerRegister[index];
    producerEntrance = chosenProducerNode.entrance;
    if (chosenProducerNode.recommendedManifest != undefined) {
      recommendedManifest = chosenProducerNode.recommendedManifest;
    }
    return producerEntrance;
  };

  //用于输入producer_required
  const generateProducerRequired = async (
    taskName: string
  ): Promise<string> => {
    //处理External情况
    if (producerEntrance == "External") {
      return "";
    }
    const schemaFilePath = path.join(
      "./schema/producer_templates",
      producerEntrance + ".json"
    );
    const schemaJson = JSON.parse(
      fs.readFileSync(schemaFilePath).toString()
    ) as Schema;
    let t: SchemaType,
      resJson: any = {},
      tmp: string,
      d: string | undefined;
    if (schemaJson.required) {
      for (const key of schemaJson.required) {
        //打印description
        d = schemaJson.properties[key].description;
        if (d != undefined) {
          console.log("");
          console.log(
            chalk.bgGray(_("Key description for ") + key) + " : " + _(d)
          );
        }
        t = schemaJson.properties[key].type;
        switch (t) {
          case "array":
            resJson[key] = await stringArray(
              `${_("Producer required ")}${chalk.cyan(_("array"))}${_(
                " parameter"
              )}：${key}, ${_("split with ,")}`,
              []
            );
            break;
          case "integer":
            resJson[key] = Number(
              await input(
                `${_("Producer required ")}${chalk.cyan(_("integer"))}${_(
                  " parameter"
                )}：${key}`,
                undefined,
                /^[0-9]+$/
              )
            );
            break;
          case "object":
            if (resJson["producer_required"] == undefined) {
              resJson["producer_required"] = {};
            }
            tmp = await input(
              `${_("Producer required ")}${chalk.cyan(_("object"))}${_(
                " parameter"
              )}：${key},${_("input Json string contained by {}")}`,
              undefined,
              /{.*}/
            );
            try {
              resJson["producer_required"][key] = JSON.parse(tmp);
            } catch (e) {
              console.log(JSON.stringify(e, null, 2));
              log(
                "Error:Can't parse input as object, please modify toml config later manually"
              );
              resJson["producer_required"][key] = {};
            }
            break;
          case "string":
            resJson[key] = await input(
              `${_("Producer required ")}${chalk.cyan(_("string"))}${_(
                " parameter"
              )}：${key}`,
              key == "shortcutName" ? taskName : undefined
            );
            break;
          default:
            log(
              `Error:Unimplemented type ${t}, please modify toml config later manually`
            );
            resJson[key] = "";
        }
      }
    }
    return TOML.stringify(resJson);
  };

  let externalScraper = true,
    scraperEntrance: string | undefined = undefined;
  const inputRequiredKeys = async (requiredKeys: string[]): Promise<string> => {
    let s = "",
      p;
    for (const key of requiredKeys) {
      //获取对象路径
      p = key.split(".");
      if (p.length == 2) {
        taskToml = inputRequiredKey(
          key,
          taskToml,
          await input(_("Scraper required parameter：") + key)
        ).unwrapOr(taskToml);
      } else {
        //生成提示语
        s += key + ",";
      }
    }
    return s;
  };
  //用于输入上游URL并进行校验
  const inputUpstreamUrl = async (): Promise<string> => {
    //要求输入上游URL
    const url = await input(
      _("Upstream URL"),
      taskName == "1" ? TEST_URL : undefined,
      /^https?:\/\/\S+/
    );
    //检索对应的模板
    for (const node of scraperRegister.reverse()) {
      if (url.match(node.urlRegex) != null) {
        console.log(
          chalk.blueBright(_("Info ")) +
            _("Matched scraper template ") +
            chalk.cyanBright(_(node.name))
        );
        //如果有required keys 则提示
        if (node.requiredKeys.length > 0) {
          const s = await inputRequiredKeys(node.requiredKeys);
          if (s != "") {
            console.log(
              chalk.yellow(_("Warning ")) +
                _("Remember to add these keys manually later : ") +
                chalk.cyan(s.slice(0, -1))
            );
          }
        }
        externalScraper = false;
        break;
      }
    }
    //处理未找到爬虫模板，可能需要外置的情况
    if (externalScraper) {
      //询问是否需要外置scraper
      if (
        await bool(
          _("No scraper template matched, use external scraper?"),
          false
        )
      ) {
        shell.cp(
          "./scripts/templates/taskScraper.ts",
          path.join(taskDir, "scraper.ts")
        );
      } else {
        externalScraper = false;
        //指定通用爬虫模板
        const universalList: ScraperRegister[] = [];
        for (const i of scraperRegister.reverse()) {
          if (i.urlRegex == "universal://") {
            universalList.push(i);
          }
        }
        if (universalList.length > 0) {
          //生成用户界面选择文本
          const choiceArray = [];
          for (const i of universalList) {
            choiceArray.push(
              _(i.name) + (i.description ? "\n" + _(i.description) : "")
            );
          }
          //让用户选择
          const index = await select(
            _("Universal scraper template"),
            choiceArray
          );
          scraperEntrance = universalList[index].entrance;
          //提示可能的requiredKeys
          if (universalList[index].requiredKeys.length > 0) {
            const tip = await inputRequiredKeys(
              universalList[index].requiredKeys
            );
            if (tip != "") {
              console.log(
                chalk.yellow(_("Warning ")) +
                  _("Remember to add these keys manually later : ") +
                  chalk.cyan(tip.slice(0, -1))
              );
            }
          }
        } else {
          console.log(
            _("Warning ") +
              _(
                "No universal scraper template found, consider modify task config manually later"
              )
          );
        }
      }
    }
    return url;
  };
  const getScraper = function (): string {
    if (externalScraper) {
      return 'scraper = "External"';
    } else {
      if (scraperEntrance == undefined) {
        return '# scraper = ""';
      } else {
        return `scraper = "${scraperEntrance}"`;
      }
    }
  };

  const Categories = CATEGORIES.sort((a, b) => {
    return a.localeCompare(b, "zh");
  });
  //构成基础json
  const json: TaskInput = {
    task: {
      name: taskName,
      category: Categories[await select(_("Task category"), Categories)],
      author: await input(_("Author")),
      url: await inputUpstreamUrl(),
    },
    template: {
      producer: await inputProducer(),
      scraper: getScraper(),
    },
    regex: {
      download_name: await input(_("Regex for downloaded file"), "\\.exe"),
    },
    parameter: {
      build_manifest: await stringArray(
        _("Build manifest, split file name with ,"),
        recommendedManifest
      ),
    },
    producer_required: await generateProducerRequired(taskName),
  };

  //修改toml并写入配置
  //console.log(JSON.stringify(json,null,2));
  fs.writeFileSync(configPath, applyInput(taskToml, json, "").unwrap());
  console.log(
    chalk.green(_("Success ")) +
      _("Task config saved to ") +
      chalk.cyanBright(configPath) +
      ", " +
      _("test it with ") +
      chalk.cyan(`yarn dev -t "${taskName}"`)
  );
}

function registerTemplate(
  node: { name: string; entrance: string },
  dir: string
) {
  //读取文本
  const filePath = `./templates/${dir}/_register.ts`;
  let text = fs.readFileSync(filePath).toString();
  //查询是否存在重复
  const regex1 = new RegExp(`name:\\s*"${node.name}"`),
    regex2 = new RegExp(`entrance:\\s*"${node.entrance}"`);
  if (text.match(regex1) || text.match(regex2)) {
    console.log(
      chalk.red(_(`Error `)) +
        _(`Given name or entrance already registered in `) +
        chalk.cyanBright(filePath) +
        _(`, delete register node before continue`)
    );
    process.exit(1);
  }
  //生成数组内容
  const newNode = `${JSON.stringify(node, null, 2)},\n];`;
  //替换文本
  text = prettier.format(text.replace("];", newNode), { parser: "babel" });
  //写回
  fs.writeFileSync(filePath, text);
  // console.log(text);
}

async function inputDescription(): Promise<string> {
  const r = await input(_("Template description(use English)"));
  console.log(
    chalk.blueBright(_("Info ")) +
      _(
        'If you want to show i18n version of your description, add key-value pair to "./i18n/LOCALE.json"'
      )
  );
  return r;
}

async function createTemplate() {
  let templatePath;
  switch (
    await select(_("Template type"), [
      _("Scraper"),
      _("Resolver"),
      _("Producer"),
    ])
  ) {
    //创建scraper
    case 0:
      //输入一个ScraperRegister
      const jsonS: ScraperRegister = {
        name: await input(_("Template title")),
        entrance: await input(
          _("Template id, should be brief and without space"),
          undefined,
          /^\S+$/
        ),
        urlRegex: await input(
          _(
            "Matching URL Regex, e.g. https?://github.com/[^/]+/[^/]+, keep empty to specify a universal template"
          ),
          "universal://"
        ),
        requiredKeys: await stringArray(
          _(
            "Required keys in task config, e.g. regex.scraper_version , split different objects with ,"
          ),
          []
        ),
      };
      //对通用爬虫增加description
      if (jsonS.urlRegex == "universal://") {
        jsonS["description"] = await inputDescription();
      }
      //注册
      registerTemplate(jsonS, "scrapers");
      //复制生成模板
      templatePath = `./templates/scrapers/${jsonS.entrance}.ts`;
      shell.cp("./scripts/templates/scraper.ts", templatePath);
      //报告
      console.log(
        chalk.green(_("Success ")) +
          _("Template saved to ") +
          chalk.cyanBright(templatePath) +
          _(
            ', template register information saved to "_register.ts" in the same directory'
          )
      );
      break;
    //创建resolver
    case 1:
      //输入一个ResolverRegister
      const jsonR: ResolverRegister = {
        name: await input(_("Template title")),
        entrance: await input(
          _("Template id, should be brief and without space"),
          undefined,
          /^\S+$/
        ),
        downloadLinkRegex: await input(
          _(
            "Matching URL Regex, e.g. https?://github.com/[^/]+/[^/]+, keep empty to specify a universal template"
          ),
          "universal://"
        ),
        requiredKeys: await stringArray(
          _(
            "Required keys in task config, e.g. parameter.resolver_cd , split different objects with ,"
          ),
          []
        ),
      };
      //注册
      registerTemplate(jsonR, "resolvers");
      //复制生成模板
      templatePath = `./templates/resolvers/${jsonR.entrance}.ts`;
      shell.cp("./scripts/templates/resolver.ts", templatePath);
      //报告
      console.log(
        chalk.green(_("Success ")) +
          _("Template saved to ") +
          chalk.cyanBright(templatePath) +
          _(
            ', template register information saved to "_register.ts" in the same directory'
          )
      );
      break;
    //创建producer
    case 2:
      //输入一个ProducerRegister
      const jsonP: ProducerRegister = {
        name: await input(_("Template title")),
        entrance: await input(
          _("Template id, should be brief and without space"),
          undefined,
          /^\S+$/
        ),
        description: await inputDescription(),
        defaultCompressLevel: Number(
          await input(
            _("Default compress level, range from 1 to 10"),
            "5",
            /^([1-9]|10)$/
          )
        ),
      };
      const recommendedManifest = await stringArray(
        _("Recommended manifest, ") + _("split with ,"),
        []
      );
      if (recommendedManifest.length > 0) {
        jsonP.recommendedManifest = recommendedManifest;
      }
      console.log(
        chalk.blueBright(_("Info ")) +
          _(
            'If you want to show i18n version of your description, add key-value pair to "./i18n/LOCALE.json"'
          )
      );
      //注册
      registerTemplate(jsonP, "producers");
      //复制生成模板
      templatePath = `./templates/producers/${jsonP.entrance}.ts`;
      shell.cp("./scripts/templates/producer.ts", templatePath);
      //复制生成schema.json
      const schemaPath = `./schema/producer_templates/${jsonP.entrance}.json`;
      shell.cp("./scripts/templates/schema.json", schemaPath);
      //报告
      console.log(
        chalk.green(_("Success ")) +
          _("Template saved to ") +
          chalk.cyanBright(templatePath) +
          _(', schema for "producer_required" object saved to ') +
          chalk.cyanBright(schemaPath) +
          _(
            ', template register information saved to "_register.ts" in the same directory'
          )
      );
      break;
  }
}

async function createWiki(): Promise<void> {
  let type = null,
    name = null;
  let indexMD = "",
    m,
    tmp,
    n;
  const types = ["scraper", "resolver", "producer"],
    regPool: Array<{ name: string; entrance: string }[]> = [
      scraperRegister,
      resolverRegister,
      producerRegister,
    ];
  //加载已存在文档目录树
  const existWikiTree: Array<string[]> = [];
  for (const i in types) {
    existWikiTree.push([]);
    fs.readdirSync(
      path.join(process.cwd(), "docs/templates", types[i])
    ).forEach((name) => {
      existWikiTree[i].push(name.split(".")[0]);
    });
  }
  //依次查询注册池寻找未添加文档的模板
  for (const i in types) {
    for (const node of regPool[i]) {
      if (!existWikiTree[i].includes(node.entrance)) {
        name = node.entrance;
        type = types[i];
        break;
      }
    }
    if (name) {
      break;
    }
  }

  //询问是否需要修改
  if (
    name == null ||
    !(await bool(
      _("Create new wiki for ") + type + _(" template ") + name + " ?",
      true
    ))
  ) {
    const typeI = await select(_("Template type"), [
      _("Scraper"),
      _("Resolver"),
      _("Producer"),
    ]);
    type = types[typeI];
    //列出模板文件列表
    const list: string[] = [];
    fs.readdirSync(path.join(process.cwd(), "templates", type + "s")).forEach(
      (name) => {
        if (name != "_register.ts") {
          list.push(name.split(".")[0]);
        }
      }
    );
    name = list[await select(_("Create wiki for"), list)];
    if (
      existWikiTree[typeI].includes(name) &&
      !(await bool(_("Already exist, overwrite?"), false))
    ) {
      return await createWiki();
    }
  }
  //让tsc确信name和type不为空
  if (name == null || type == null) {
    log("Error:Fatal error : name or type null");
    return;
  }
  //读取索引MarkDown，定义替换函数
  indexMD = fs
    .readFileSync(path.join(process.cwd(), "docs", "templates", type + ".md"))
    .toString();
  const r = (label: string, content: string) => {
    const cmt = `<!-- \${${label}} -->`;
    if (indexMD.includes(content)) {
      return;
    }
    indexMD = indexMD.replace(cmt, content + "\n" + cmt);
  };
  //读取模板文本
  let regNode: ScraperRegister | ResolverRegister | ProducerRegister | null,
    tsText = fs
      .readFileSync(
        path.join(process.cwd(), "templates", type + "s", name + ".ts")
      )
      .toString();
  //定义注册池查询函数和清洗函数
  const getRegNode = function <T extends { entrance: string }>(
    regPool: T[],
    entrance: string
  ): T | null {
    let r = null;
    for (const n of regPool) {
      if (n.entrance == entrance) {
        r = n;
        break;
      }
    }
    return r;
  };
  const wash = function (dirty: string): string {
    const m = dirty.match(/\w+/g);
    if (m) {
      return m[0];
    } else {
      throw "Error:Internal error : can't wash string : " + dirty;
    }
  };
  //根据具体类型进行处理
  const required: ParameterDeclare[] = [],
    valid: ParameterDeclare[] = [];
  switch (type as "scraper" | "resolver" | "producer") {
    case "scraper":
      regNode = getRegNode(scraperRegister, name);
      if (regNode) {
        //匹配对Temp接口的申明
        m = tsText.match(/interface Temp {[^}]*}/g);
        const declareLines = m ? m[0].match(/^\s*[\w:?\t; ]+$/gm) : null;
        //如果申明了Temp接口
        if (m && declareLines) {
          //生成必须数组和可选数组
          for (const line of declareLines) {
            if (line.includes("?")) {
              //添加到可选参数
              tmp = line.split(":");
              valid.push({
                key: wash(tmp[0]),
                type: wash(tmp[1]),
                title: "scraper_temp",
              });
            } else {
              //添加到必须参数
              tmp = line.split(":");
              required.push({
                key: wash(tmp[0]),
                type: wash(tmp[1]),
                title: "scraper_temp",
              });
            }
          }
        }
        //补充来自注册节点的required信息
        let s;
        regNode.requiredKeys.forEach((key) => {
          s = key.split(".");
          if (s.length != 2) {
            log("Error:Format error in requiredKeys (_register.ts) : " + key);
            return;
          }
          if (s[0] != "scraper_temp") {
            required.push({
              key: s[0],
              type: "string",
              title: s[1],
            });
          }
        });
        //填充Wiki模板文本
        const wikiText = `# ${regNode.name}\n* 类型：爬虫\n* 入口：\`${
          regNode.entrance
        }\`\n* 适用 URL：\`${
          regNode.urlRegex == "universal://" ? "通用" : regNode.urlRegex
        }\`\n\n${
          regNode.description
            ? _(regNode.description).replace(/\n/g, "\n\n")
            : "在此填写详细说明"
        }\n## 必须提供的参数\n${genParameterWiki(
          required
        )}\n## 可选的参数\n${genParameterWiki(valid)}`;
        //写Wiki
        const wikiPath = path.join(
          process.cwd(),
          "docs/templates",
          type,
          name + ".md"
        );
        fs.writeFileSync(wikiPath, wikiText);
        //注册Wiki
        const label =
          regNode.urlRegex == "universal://"
            ? "Scraper_Universal"
            : "Scraper_URL";
        r(label, `* [${regNode.name}](./${type}/${regNode.entrance}.md)`);
        fs.writeFileSync(
          path.join(process.cwd(), "docs", "templates", type + ".md"),
          indexMD
        );
        //打印提示
        console.log(
          chalk.green(_("Success ")),
          _("Wiki template saved to ") +
            chalk.cyanBright(wikiPath) +
            _(", modify it to add more information")
        );
      } else {
        log(`Error:Template ${name} not registered yet`);
      }
      break;
    case "resolver":
      regNode = getRegNode(resolverRegister, name);
      if (regNode) {
        //从注册节点添加required
        let s;
        regNode.requiredKeys.forEach((key) => {
          s = key.split(".");
          if (s.length != 2) {
            log("Error:Format error in requiredKeys (_register.ts) : " + key);
            return;
          }
          if (s[0] != "scraper_temp") {
            required.push({
              key: s[0],
              type: "string",
              title: s[1],
            });
          }
        });
        //填充Wiki模板文本
        const wikiText =
          `# ${regNode.name}\n* 类型：解析器\n* 入口：\`${
            regNode.entrance
          }\`\n* 适用 URL：\`${
            regNode.downloadLinkRegex == "universal://"
              ? "通用"
              : regNode.downloadLinkRegex
          }\`` +
          (regNode.downloadLinkRegex == "universal://"
            ? `\n\n:::tip 使用方式\n任务：将任务配置的 \`template.resolver\` 配置为 \`${regNode.entrance}\`\n\n爬虫模板：返回时指定 \`resolverParameter.entrance\` 为 \`${regNode.entrance}\`\n:::`
            : "") +
          `\n\n${
            regNode.description
              ? _(regNode.description).replace(/\n/g, "\n\n")
              : "在此填写详细说明"
          }\n## 必须提供的参数\n${genParameterWiki(required)}`;
        //写Wiki
        const wikiPath = path.join(
          process.cwd(),
          "docs/templates",
          type,
          name + ".md"
        );
        fs.writeFileSync(wikiPath, wikiText);
        //注册Wiki
        const label =
          regNode.downloadLinkRegex == "universal://"
            ? "Resolver_Universal"
            : "Resolver_URL";
        r(label, `* [${regNode.name}](./${type}/${regNode.entrance}.md)`);
        fs.writeFileSync(
          path.join(process.cwd(), "docs", "templates", type + ".md"),
          indexMD
        );
        //打印提示
        console.log(
          chalk.green(_("Success ")),
          _("Wiki template saved to ") +
            chalk.cyanBright(wikiPath) +
            _(", modify it to add more information")
        );
        if (required.length > 0) {
          console.log(
            chalk.yellow(_("Warning ")),
            _('Use "string" as the type of required keys, modify if discrepant')
          );
        }
      } else {
        log(`Error:Template ${name} not registered yet`);
      }
      break;
    case "producer":
      regNode = getRegNode(producerRegister, name);
      if (regNode) {
        //读取schema文件
        const schema = JSON.parse(
          fs
            .readFileSync(
              path.join(
                process.cwd(),
                "schema/producer_templates",
                regNode.entrance + ".json"
              )
            )
            .toString()
        ) as JSONSchema4;
        if (schema.required == null || typeof schema.required == "boolean") {
          schema.required = [];
        }
        //生成两个数组
        let obj: JSONSchema4;
        for (const key in schema.properties) {
          obj = schema.properties[key];
          if (schema.required.includes(key)) {
            required.push({
              key,
              type:
                obj.type == "array"
                  ? `Array<${(obj.items as any).type}>`
                  : (obj.type as string),
              description: obj.description ? _(obj.description) : undefined,
              title: "producer_required",
            });
          } else {
            valid.push({
              key,
              type:
                obj.type == "array"
                  ? `Array<${(obj.items as any).type}>`
                  : (obj.type as string),
              description: obj.description ? _(obj.description) : undefined,
              title: "producer_required",
            });
          }
        }
        //填充Wiki模板文本
        const wikiText = `# ${regNode.name}\n* 类型：制作器\n* 入口：\`${
          regNode.entrance
        }\`\n\n${
          regNode.description
            ? _(regNode.description).replace(/\n/g, "\n\n")
            : "在此填写详细说明"
        }\n## 必须提供的参数\n${genParameterWiki(
          required
        )}\n## 可选的参数\n${genParameterWiki(valid)}`;
        //写Wiki
        const wikiPath = path.join(
          process.cwd(),
          "docs/templates",
          type,
          name + ".md"
        );
        fs.writeFileSync(wikiPath, wikiText);
        //注册Wiki
        const label = "Producer";
        r(label, `* [${regNode.name}](./${type}/${regNode.entrance}.md)`);
        fs.writeFileSync(
          path.join(process.cwd(), "docs", "templates", type + ".md"),
          indexMD
        );
        //打印提示
        console.log(
          chalk.green(_("Success ")),
          _("Wiki template saved to ") +
            chalk.cyanBright(wikiPath) +
            _(", modify it to add more information")
        );
      } else {
        log(`Error:Template ${name} not registered yet`);
      }
      break;
  }
}

async function main() {
  //初始化i18n
  init();
  //处理参数过少
  if (process.argv.length < 3) {
    printHelp();
    return;
  }
  switch (process.argv[2]) {
    case "task":
      await createTask();
      break;
    case "template":
      await createTemplate();
      break;
    case "wiki":
      await createWiki();
      break;
    default:
      log(`Error:Unknown argument '${process.argv[2]}'`);
      printHelp();
      break;
  }
}

async function test() {
  //读取文本
  const filePath = `./templates/scrapers/_register.ts`;
  const text = fs.readFileSync(filePath).toString();
  //查询是否存在重复
  const node = {
    name: "Scoop",
    entrance: "Scoop",
  };
  const regex1 = new RegExp(`name:\\s*"${node.name}"`),
    regex2 = new RegExp(`entrance:\\s*"${node.entrance}"`);
  console.log(regex1);
  console.log(JSON.stringify(text.match(regex1), null, 2));
  // if(text.match(regex1)||text.match(regex2)){
  // 	log(`Error:`+_(`Given name or entrance already registered in `)+chalk.cyanBright(filePath)+_(`, delete register node before continue`))
  // }
}

main().then((_) => {
  process.exit(0);
});
