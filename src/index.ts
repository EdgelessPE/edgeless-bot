import configGenerator from './config'
import {CONFIG} from "./class";
import {initAria2c} from "./aria2";

export const config:CONFIG=configGenerator().unwrap()

async function main(){

}

async function test() {
    //console.log()
    await initAria2c()
}

test().then(_=>{})
