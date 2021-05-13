import chalk from "chalk"
import { DatabaseNode } from "./class"
import { log } from './utils'

enum Weather {
    Sunny, Cloudy, Overcast, Rainy, Thunderstorm
}

export function barometer(DB: any) {
    console.log("=================================================")
    //遍历所有键值
    for (let taskName in DB) {
        //读取节点
        let node: DatabaseNode = DB[taskName] as DatabaseNode

        //判断是否存在有效构建记录
        if (node.recentStatus.length === 0) {
            log("Warning:Task " + taskName + " has no valid build records")
            return
        }

        //计算失败次数
        let failureTime: number = 0
        node.recentStatus.forEach((item) => {
            if (!item.success) failureTime++
        })

        //计算成功次数
        let successTime: number = node.recentStatus.length - failureTime

        //根据失败次数显示
        //3:0 晴
        //2:1 多云
        //1:2 雨
        //0:3 雷阵雨
        //
        //2:0 晴
        //1:1 阴
        //0:3 雷阵雨
        //
        //1:0 晴
        //0:1 雷阵雨

        //处理晴
        if (failureTime === 0) {
            print(Weather.Sunny, taskName, successTime, failureTime)
            continue
        }
        //处理雷阵雨
        if (successTime === 0) {
            print(Weather.Thunderstorm, taskName, successTime, failureTime)
            continue
        }
        //处理特定情况
        let statusCode: number = successTime * 10 + failureTime
        switch (statusCode) {
            case 21:
                print(Weather.Cloudy, taskName, successTime, failureTime)
                break
            case 12:
                print(Weather.Rainy, taskName, successTime, failureTime)
                break
            case 11:
                print(Weather.Overcast, taskName, successTime, failureTime)
                break
            default:
                log("Warning:Unknown status code:" + statusCode)
                print(Weather.Overcast, taskName, successTime, failureTime)
                break
        }
    }
}

function print(w: Weather, name: string, successTime: number, failureTime: number) {
    let text: string = name + "   (" + successTime + "/" + (successTime + failureTime) + ")"
    switch (w) {
        case Weather.Sunny:
            console.log("🌞  " + chalk.bold.green(text));
            break;
        case Weather.Cloudy:
            console.log("⛅  " + chalk.blue(text));
            break;
        case Weather.Overcast:
            console.log("☁   " + chalk.yellow(text));
            break;
        case Weather.Rainy:
            console.log("🌧  " + chalk.keyword('orange')(text));
            break;
        case Weather.Thunderstorm:
            console.log("🌩  " + chalk.red(text));
            break;
        default:
            console.log(chalk.yellow("Warning") + " Illegal print detected");
            console.log(text);
    }
}