import axios, { AxiosRequestConfig } from "axios";
import { Err, Ok, Result } from "ts-results";
import { log, sleep } from "./utils";
import { config } from "./config";

function getConfig(axiosConfig?: AxiosRequestConfig): AxiosRequestConfig {
  const result: AxiosRequestConfig = axiosConfig ?? {};
  //处理全局代理
  if (config.GLOBAL_PROXY) {
    const url = config.GLOBAL_PROXY;
    const sp1 = url.split(":");
    const protocol = sp1[0],
      port = Number(sp1[2]);
    const host = sp1[1].split("//")[1];

    result["proxy"] = {
      protocol,
      host,
      port,
    };
  }
  //增加UA
  if (result.headers == undefined) result.headers = {};
  result.headers["user-agent"] =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36";
  return result;
}

async function singleFetch(
  url: string,
  axiosConfig?: AxiosRequestConfig
): Promise<Result<unknown, string>> {
  let res;
  try {
    res = await axios.get(url, getConfig(axiosConfig));
  } catch (err) {
    //console.log(JSON.stringify(err));
    return new Err("Warning:Single fetch failed for " + url);
  }
  return new Ok(res.data);
}

//返回axios中的res.data
async function robustGet(
  url: string,
  axiosConfig?: AxiosRequestConfig
): Promise<Result<unknown, string>> {
  let result = null,
    r;
  for (let i = 0; i < config.MAX_RETRY_SCRAPER; i++) {
    r = await singleFetch(url, axiosConfig);
    if (r.ok) {
      result = r.unwrap();
      break;
    } else {
      log(r.val);
      if (i != config.MAX_RETRY_SCRAPER - 1) {
        await sleep(3000);
      }
    }
  }

  if (result == null) {
    return new Err(`Error:Robust get failed : ${url}`);
  } else {
    return new Ok(result);
  }
}

async function fetchURL(url: string): Promise<Result<string, string>> {
  return new Promise((resolve) => {
    axios.get(url, getConfig({ maxRedirects: 0 })).catch((e) => {
      if (
        e.response &&
        (e.response.status == 301 ||
          e.response.status == 302 ||
          e.response.status == 303)
      ) {
        resolve(new Ok(e.response.headers.location));
      } else {
        //console.log(e.response?.status)
        resolve(
          new Err(
            "Warning:Single fetch failed for " +
              url +
              " :\n" +
              JSON.stringify(e)
          )
        );
      }
    });
  });
}

async function robustParseRedirect(
  url: string
): Promise<Result<string, string>> {
  let result = null,
    r;
  for (let i = 0; i < config.MAX_RETRY_SCRAPER; i++) {
    r = await fetchURL(url);
    if (r.ok) {
      result = r.unwrap();
      break;
    } else {
      log(r.val);
      if (i != config.MAX_RETRY_SCRAPER - 1) {
        await sleep(3000);
      }
    }
  }

  if (result == null) {
    return new Err(`Error:Robust get failed : ${url}`);
  } else {
    return new Ok(result);
  }
}

export { robustGet, robustParseRedirect };
