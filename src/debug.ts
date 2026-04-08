import type { DebugArtifactPayload, ExtractResult, FetchResult } from "./types.js";

export function buildDebugArtifactPayload(
  fetchResult: FetchResult,
  extractResult: ExtractResult
): DebugArtifactPayload {
  return {
    fetch: {
      sourceUrl: fetchResult.sourceUrl,
      finalUrl: fetchResult.finalUrl,
      status: fetchResult.status
    },
    extract: {
      status: "success",
      result: extractResult
    }
  };
}

export function buildDebugArtifactErrorPayload(
  fetchResult: FetchResult,
  stage: "extract" | "normalize" | "render",
  error: unknown
): DebugArtifactPayload {
  return {
    fetch: {
      sourceUrl: fetchResult.sourceUrl,
      finalUrl: fetchResult.finalUrl,
      status: fetchResult.status
    },
    extract: {
      status: "error",
      stage,
      error: {
        name: error instanceof Error ? error.name : "Error",
        message: error instanceof Error ? error.message : String(error)
      }
    }
  };
}
