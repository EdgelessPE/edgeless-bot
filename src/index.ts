import {sleep} from "./utils";
import {isMainThread} from 'worker_threads'
import scraper from "./scraper";

async function main() {

}

async function test() {
    await scraper([
        {
            name: "balenaEtcher",
            author: "Cno",
            category: "压缩镜像",
            pageUrl: "https://github.com/balena-io/etcher",
            template: {
                producer: "Click2Install"
            },
            producer_required: {},
            parameter: {
                build_manifest: [""]
            }
        }
    ])

}

if (isMainThread) test().then(async _ => {
    await sleep(1000)
    process.exit(0)
})
