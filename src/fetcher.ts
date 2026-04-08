import type { FetchResult } from "./types.js";

export async function fetchSharedLink(sourceUrl: string): Promise<FetchResult> {
  const response = await fetch(sourceUrl, {
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch shared link: HTTP ${response.status}`);
  }

  return {
    sourceUrl,
    finalUrl: response.url,
    status: response.status,
    html: await response.text()
  };
}
