import { Err, Ok, Result } from "ts-results";
import { ResolverParameters, ResolverReturned } from "../../src/types/class";
import { log } from "../../src/utils";
import { robustGet } from "../../src/utils/network";

export default async function (
  p: ResolverParameters,
): Promise<Result<ResolverReturned, string>> {
  const { downloadLink, password, cd, fileMatchRegex } = p;

  //YOUR CODE HERE

  return new Ok({
    directLink: "http://localhost/file.exe",
  });
}
