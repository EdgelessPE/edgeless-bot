import { ResolverParameters, ResolverReturned } from "@/types/class";
import { log } from "@/utils";
import { robustGet } from "@/utils/network";
import { Err, Ok, Result } from "ts-results";

export default async function (
  p: ResolverParameters,
): Promise<Result<ResolverReturned, string>> {
  const { downloadLink, password, cd, fileMatchRegex } = p;

  //YOUR CODE HERE

  return new Ok({
    directLink: "http://localhost/file.exe",
  });
}
