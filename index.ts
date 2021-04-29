const axios=require("axios")
const fs=require("fs")
const cheerio=require("cheerio")
//Enum
enum TypeStatus {
    SUCCESS,ERROR
}

//Struct
class Interface {
    type:TypeStatus
    payload:any
}
class PageInfo {
    text:string
    href:string
}

//utils
function parseDownloadUrl(href:string):string {
    //识别根目录字符“/”
    if(href[0]==="/") href="https://portableapps.com"+href

    return encodeURI(href)
}

//scraper
async function scrapePage(url):Promise<Interface>{
    //配置可识别的类名
    let validClassName=[".download-link",".download-info"]

    //获取HTML信息并挂载
    let res=await axios.get(url)

    //挂载HTML
    let $ = cheerio.load(res.data)

    //获取download-box DOM
    let dom_box=$(".download-box")

    //判断dom_box是否有效
    if(!dom_box){
        return {
            type:TypeStatus.ERROR,
            payload:"Error:DOM_DOWNLOAD_BOX not found,can't scrape "+url
        }
    }

    //获取有效节点
    let dom_node=null
    for (let i in validClassName) {
        dom_node=dom_box.children(validClassName[i])
        if(dom_node.attr("class")) break
    }

    //判断dom_node是否有效
    if(!dom_node.attr("class")){
        return {
            type:TypeStatus.ERROR,
            payload:"Error:Valid dom node not found,can't scrape "+url
        }
    }
    console.log("Info:Get valid dom node whose class is \""+dom_node.attr("class")+"\"")

    //分className处理，获取text和href
    let result=new PageInfo()
    switch (dom_node.attr("class")) {
        case "download-link":
            result.text=dom_node.text()
            result.href=dom_node.attr("href")
            break
        case "download-info":
            //获取box的首个子节点
            let dom_btn=dom_box.children("a")

            result.text=dom_node.text()
            result.href=dom_btn.attr("href")
            break
    }

    //校验结果是否有效
    if(!result.text||!result.href){
        return {
            type:TypeStatus.ERROR,
            payload:"Error:Null value caught in result,can't scrape "+url
        }
    }

    //处理href
    result.href=parseDownloadUrl(result.href)

    //输出提示
    console.log("Info:Scraped successfully")

    return {
        type:TypeStatus.SUCCESS,
        payload:result
    }
}

//main
scrapePage("https://portableapps.com/apps/music_video/potplayer-portable")
.then((res)=>{
    if(res.type===TypeStatus.ERROR){
        console.log(res.payload)
    }else{
        let pageInfo=res.payload as PageInfo
        console.log(pageInfo.text)
        console.log(pageInfo.href)
    }
})