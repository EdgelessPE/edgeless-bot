import register from "../templates/resolvers/_register"
import {Err, Ok, Result} from "ts-results";
import {ResolverRegister} from "./class";

function searchTemplate(url: string): Result<ResolverRegister, string> {
    let result = null
    for (let node of register) {
        if (url.match(node.downloadLinkRegex)) {
            result = node
            break
        }
    }
    if (result == null) {
        return new Err("Error:Can't find matched resolver template for " + url)
    } else {
        return new Ok(result)
    }
}

// export default async function (url:string):Result<string, string>{
//
// }
