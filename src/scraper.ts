import { Interface, PageInfo } from './class'
import { Status } from "./enum"
import { log, parseDownloadUrl } from './utils'
import axios from "axios"
import cheerio from "cheerio"
import fs from 'fs'

//scraper,enable useFS when debugging that the function will load page ./1.html
export async function scrapePage(
    url: string,
    useFS: boolean
): Promise<Interface<PageInfo>> {
    let result = ({} as unknown) as PageInfo;

    //配置可识别的类名
    let validClassName = [".download-link", ".download-info"];

    //获取HTML信息并挂载
    log("Info:Start scraping page: " + url);
    let res;
    try {
        if (!useFS) res = await axios.get(url);
    } catch (err) {
        console.log(JSON.stringify(err))
        return new Interface({
            status: Status.ERROR,
            payload: (("Error:Http status code abnormal,can't scrape " +
                url +
                " ,message:" +
                err.message) as unknown) as PageInfo,
        });
    }

    //挂载HTML
    let $ = cheerio.load(
        useFS ? fs.readFileSync("./1.html").toString() : res?.data
    );

    //获取download-box DOM
    let dom_box = $(".download-box");

    //判断dom_box是否有效
    if (!dom_box) {
        return new Interface({
            status: Status.ERROR,
            payload: (("Error:DOM_DOWNLOAD_BOX not found,can't scrape " +
                url +
                ",skipping...") as unknown) as PageInfo,
        });
    }

    //获取有效节点
    let dom_node: cheerio.Cheerio = ({} as unknown) as cheerio.Cheerio;
    for (let i in validClassName) {
        dom_node = dom_box.children(validClassName[i]);
        if (dom_node.attr("class")) break;
    }

    //判断dom_node是否有效
    if (!dom_node.attr("class")) {
        return new Interface({
            status: Status.ERROR,
            payload: (("Error:Valid dom node not found,can't scrape " +
                url +
                ",skipping...") as unknown) as PageInfo,
        });
    }
    log(
        'Info:Get valid dom node whose class is "' + dom_node.attr("class") + '"'
    );

    //尝试获取MD5
    let md5TagResult = $("strong:contains('MD5')");
    if (md5TagResult.length === 0) {
        log("Warning:No MD5 tag found in this page");
    } else {
        try {
            result.md5 = md5TagResult
                .parent("li")
                .get(0)
                .children[1].data.substring(2);
        } catch (err) {
            console.log(JSON.stringify(err))
            log("Warning:Fail to get MD5 value");
        }
    }

    //分className处理，获取text和href
    switch (dom_node.attr("class")) {
        case "download-link":
            log("Warning:You may provided a short term supported application,please check the paUrl")
            result.text = dom_node.text();
            result.href = dom_node.attr("href") as string;
            break;
        case "download-info":
            //获取box的首个子节点
            let dom_btn = dom_box.children("a");

            //产生两个属性
            result.text = dom_node.text();
            result.href = dom_btn.attr("href") as string;

            //查询是否为多语言
            if (result.text.match(/Multilingual/) == null) {
                //匹配是否为英文
                if (result.text.match(/English/)) {
                    //尝试获取多语言下载列表
                    log(
                        "Info:English application detected,trying to match simplified chinese version"
                    );
                    let table = $(".zebra.download-links");
                    if (table.length > 0) {
                        //获取简体中文下载地址
                        let recordParent = table
                            .find("td:contains('Simplified')")
                            .parent("tr");
                        if (recordParent.length > 0) {
                            //获得下载地址
                            result.href = recordParent.find("a").get(0).attribs.href;
                            //尝试获得md5
                            try {
                                result.md5 = recordParent
                                    .children("td")
                                    .get(3).children[0].data;
                            } catch (err) {
                                console.log(JSON.stringify(err))
                                log("Warning:Fail to got md5");
                            }
                            log(
                                "Info:Found simplified chinese version\nmd5:" +
                                result.md5 +
                                "\ndownload link:" +
                                result.href
                            );
                        } else {
                            log(
                                "Warning:Simplified chinese version not found,use English version"
                            );
                        }
                    } else {
                        log("Warning:Localizations table not found,use English version");
                    }
                } else {
                    log(
                        "Warning:Detected minority language application,check the default language of " +
                        url
                    );
                }
            }
            break;
    }

    //校验结果是否有效
    if (!result.text || !result.href) {
        return new Interface({
            status: Status.ERROR,
            payload: (("Error:Null value caught in result,can't scrape " +
                url) as unknown) as PageInfo,
        });
    }

    //校验md5
    if (result.md5 == undefined) result.md5 = "";
    if (
        result.md5 !== "" &&
        result.md5.match(/([a-f\d]{32}|[A-F\d]{32})/) == null
    ) {
        log("Warning:Fail to check md5,got " + result.md5);
        result.md5 = "";
    }

    //处理href
    result.href = parseDownloadUrl(result.href);

    //输出提示
    log(
        "Info:Scraped successfully,got\ntext: " +
        result.text +
        "\ndownload link: " +
        result.href
    );
    if (result.md5 !== "") console.log("md5: " + result.md5 ?? "none");

    return new Interface({
        status: Status.SUCCESS,
        payload: result,
    });
} //Interface:PageInfo