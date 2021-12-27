import config from './config'

async function main(){

}

async function test() {
    console.log(config().unwrap())
}

test().then(_=>{})
