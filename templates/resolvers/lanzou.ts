import { ResolverParameters, ResolverReturned } from "@/types/class";
import { log } from "@/utils";
import { loadShareUrl } from "lanzou-api";
import { Err, Ok, Result } from "ts-results";

export default async function (
  p: ResolverParameters,
): Promise<Result<ResolverReturned, string>> {
  const { downloadLink, password, cd, fileMatchRegex } = p;
  log(`Info:Resolving download link: ${downloadLink}`);
  if (cd?.length) {
    log(
      `Warning:Resolver template 'Lanzou' doesn't support cd currently, ignoring cd array : '${JSON.stringify(
        cd,
      )}'`,
    );
  }

  const res = await loadShareUrl(downloadLink, password);
  if (res.isErr()) {
    return new Err(res.unwrapErr());
  }
  const data = res.unwrap();

  if (data.type === "file") {
    log(
      `Info:Parsed file : '${data.name}', download link : '${data.downloadUrl}'`,
    );
    return new Ok({
      directLink: data.downloadUrl,
    });
  } else {
    log(
      `Info:Matching file with regex '${fileMatchRegex}' in the share folder`,
    );
    const { nodes } = data;
    const regex = new RegExp(fileMatchRegex);
    for (const { name_all, shareUrl } of nodes) {
      if (regex.test(name_all)) {
        log(`Info:Matched file '${name_all}'`);
        const r = await loadShareUrl(shareUrl);
        if (r.isErr()) {
          return new Err(r.unwrapErr());
        } else {
          const d = r.unwrap();
          if (d.type === "folder") {
            return new Err(
              "Error:Matched folder '${name}', not file; Cd param hasn't been supported yet",
            );
          }
          return new Ok({
            directLink: d.downloadUrl,
          });
        }
      }
    }
    return new Err("Error:Can't match file");
  }
}
