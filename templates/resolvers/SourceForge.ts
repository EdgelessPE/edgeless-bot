import { ResolverParameters, ResolverReturned } from "../../src/class";
import { Ok, Err, Result } from "ts-results";
import { log } from "../../src/utils";
import axios from "axios";

export default async function (
  p: ResolverParameters,
): Promise<Result<ResolverReturned, string>> {
  const { downloadLink } = p;
  log(`Info:Resolving SourceForge download link: ${downloadLink}`);

  const downloadPageUrl = downloadLink.endsWith("/download")
    ? downloadLink
    : `${downloadLink}/download`;

  try {
    const response = await axios.get(downloadPageUrl, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const contentType = response.headers["content-type"] || "";
    const location = response.headers["location"];

    if (location) {
      log(`Info:SourceForge redirect to: ${location}`);
      return new Ok({
        directLink: location,
      });
    }

    if (
      contentType.includes("application/zip") ||
      contentType.includes("application/octet-stream") ||
      contentType.includes("application/x-zip-compressed")
    ) {
      return new Ok({
        directLink: downloadPageUrl,
      });
    }

    const html = response.data as string;
    const match = html.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);
    if (match) {
      log(`Info:SourceForge JS redirect to: ${match[1]}`);
      return new Ok({
        directLink: match[1],
      });
    }

    const metaRefreshMatch = html.match(
      /<meta[^>]*http-equiv=["']refresh["'][^>]*content=["']\d+;\s*url=([^"']+)["']/i,
    );
    if (metaRefreshMatch) {
      log(`Info:SourceForge meta refresh to: ${metaRefreshMatch[1]}`);
      return new Ok({
        directLink: metaRefreshMatch[1],
      });
    }

    return new Err(
      `Error:Could not resolve SourceForge download link: ${downloadLink}`,
    );
  } catch (e: any) {
    if (
      e.response &&
      e.response.status === 302 &&
      e.response.headers.location
    ) {
      log(`Info:SourceForge redirect (302) to: ${e.response.headers.location}`);
      return new Ok({
        directLink: e.response.headers.location,
      });
    }
    if (
      e.response &&
      e.response.status === 301 &&
      e.response.headers.location
    ) {
      log(`Info:SourceForge redirect (301) to: ${e.response.headers.location}`);
      return new Ok({
        directLink: e.response.headers.location,
      });
    }
    return new Err(`Error:Failed to fetch SourceForge page: ${e.message}`);
  }
}
