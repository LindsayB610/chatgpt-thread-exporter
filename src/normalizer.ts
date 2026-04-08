import type { CliOptions, ExportTranscript, ExtractResult, FetchResult } from "./types.js";
import { deriveTitle } from "./utils/title.js";

export function normalizeTranscript(
  fetchResult: FetchResult,
  extractResult: ExtractResult,
  options: CliOptions
): ExportTranscript {
  const title = deriveTitle(options.title);

  return {
    sourceUrl: fetchResult.sourceUrl,
    finalUrl: fetchResult.finalUrl,
    exportedAt: new Date().toISOString(),
    title,
    turns: [
      {
        id: "stub-1",
        role: "system",
        blocks: [
          {
            kind: "unknown",
            summary: "Transcript extraction is not implemented yet."
          }
        ],
        metadata: {
          source: {
            extractResult
          }
        }
      }
    ]
  };
}
