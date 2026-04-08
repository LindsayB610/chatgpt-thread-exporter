import type { FetchResult } from "./types.js";

const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT = "chatgpt-thread-exporter";

export async function fetchSharedLink(sourceUrl: string): Promise<FetchResult> {
  const url = parseSharedLinkUrl(sourceUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT
      }
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Failed to fetch shared link: request timed out after ${FETCH_TIMEOUT_MS}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch shared link: HTTP ${response.status}`);
  }

  return {
    sourceUrl: url.toString(),
    finalUrl: response.url,
    status: response.status,
    html: await response.text()
  };
}

function parseSharedLinkUrl(sourceUrl: string): URL {
  let url: URL;

  try {
    url = new URL(sourceUrl);
  } catch {
    throw new Error("Invalid URL: --url must be a valid absolute URL");
  }

  if (!/^https?:$/.test(url.protocol)) {
    throw new Error("Invalid URL: --url must use http or https");
  }

  return url;
}
