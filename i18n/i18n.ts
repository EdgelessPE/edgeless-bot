import fs from "fs";
import { PROJECT_ROOT } from "../src/const";
import path from "path";
import { log } from "../src/utils";

let dictionary: Record<string, string> = {},
  loaded = false;

export function init() {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  // console.log(locale)
  // locale="en-US"
  if (locale.slice(0, 2) == "en") {
    return;
  }
  const dicPath = path.join(PROJECT_ROOT, "i18n", `${locale}.json`);
  if (!fs.existsSync(dicPath)) {
    log(`Warning:Dictionary for locale ${locale} not implemented yet`);
    return;
  } else {
    dictionary = JSON.parse(fs.readFileSync(dicPath).toString());
    loaded = true;
    return;
  }
}

export function t(eng: string): string {
  if (loaded) {
    if (eng in dictionary) {
      return dictionary[eng];
    } else {
      return eng;
    }
  } else {
    return eng;
  }
}
