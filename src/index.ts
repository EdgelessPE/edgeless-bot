import configGenerator from './config'
import {CONFIG} from "./class";

export const config:CONFIG=configGenerator().unwrap()

async function main(){

}

async function test() {
    console.log()
}

test().then(_=>{})
