import type { ExtractResult } from "./types.js";

export function extractConversationPayload(html: string): ExtractResult {
  if (!html.trim()) {
    throw new Error("Shared-link page was empty.");
  }

  // Placeholder implementation for scaffolding. The first real extractor
  // should be driven by saved fixtures from real shared-link pages.
  return {
    payload: {
      htmlLength: html.length
    },
    metadata: {
      strategy: "stub"
    }
  };
}
