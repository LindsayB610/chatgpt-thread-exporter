import { describe, expect, it, vi } from "vitest";
import { extractConversationPayload } from "../../src/extractor.js";
import { normalizeTranscript } from "../../src/normalizer.js";
import { renderMarkdown } from "../../src/renderer.js";
import type { CliOptions, FetchResult } from "../../src/types.js";
import { readSharedLinkFixture } from "../helpers/fixtures.js";

const fetchResult: FetchResult = {
  sourceUrl: "https://chatgpt.com/share/example",
  finalUrl: "https://chatgpt.com/share/example",
  status: 200,
  html: "<html></html>"
};

const baseOptions: CliOptions = {
  url: "https://chatgpt.com/share/example"
};

describe("normalizeTranscript", () => {
  it("normalizes plain-text fixtures into user and assistant turns", () => {
    const extractResult = extractConversationPayload(
      readSharedLinkFixture("plain-text-thread.fixture.html")
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00.000Z"));

    const transcript = normalizeTranscript(fetchResult, extractResult, baseOptions);

    vi.useRealTimers();

    expect(transcript.title).toBe("Planning a neighborhood potluck");
    expect(transcript.turns).toMatchObject([
      {
        id: "user-1",
        role: "user",
        blocks: [{ kind: "text", text: "Can you help me plan a neighborhood potluck for twelve people?" }]
      },
      {
        id: "assistant-1",
        role: "assistant",
        blocks: [
          {
            kind: "text",
            text: "Start with a simple sign-up sheet, a main dish plan, and one fallback dessert."
          }
        ]
      }
    ]);
  });

  it("preserves text and code as separate first-class blocks", () => {
    const extractResult = extractConversationPayload(
      readSharedLinkFixture("code-block-thread.fixture.html")
    );
    const transcript = normalizeTranscript(fetchResult, extractResult, baseOptions);
    const assistantTurn = transcript.turns[1];

    expect(assistantTurn.role).toBe("assistant");
    expect(assistantTurn.blocks).toEqual([
      { kind: "text", text: "Here is a small helper." },
      {
        kind: "code",
        text: "export function formatIsoDate(date: Date): string {\n  return date.toISOString().slice(0, 10);\n}",
        language: "ts"
      }
    ]);

    const markdown = renderMarkdown(transcript);
    expect(markdown).toContain("## Assistant");
    expect(markdown).toContain("```ts");
    expect(markdown).toContain("Here is a small helper.");
  });

  it("degrades unsupported content into explicit placeholders and attachment metadata", () => {
    const extractResult = extractConversationPayload(
      readSharedLinkFixture("rich-content-thread.fixture.html")
    );
    const transcript = normalizeTranscript(fetchResult, extractResult, baseOptions);
    const assistantTurn = transcript.turns[1];

    expect(assistantTurn.blocks).toContainEqual({
      kind: "unknown",
      rawType: "image_reference",
      summary: "Unsupported content preserved as metadata: hero-shortlist-1.jpg"
    });
    expect(assistantTurn.metadata?.attachments).toContainEqual({
      name: "hero-shortlist-1.jpg",
      mimeType: "image/jpeg",
      url: undefined
    });
  });

  it("adds a clear partial-thread placeholder turn when the payload is incomplete", () => {
    const extractResult = extractConversationPayload(
      readSharedLinkFixture("partial-thread.fixture.html")
    );
    const transcript = normalizeTranscript(fetchResult, extractResult, baseOptions);
    const finalTurn = transcript.turns.at(-1);

    expect(transcript.title).toBe("Road trip packing list");
    expect(finalTurn).toMatchObject({
      id: "system-partial-thread",
      role: "system",
      blocks: [
        {
          kind: "unknown",
          summary: "This shared conversation appears to be partial. Some earlier or later turns may be missing."
        }
      ]
    });
  });

  it("falls back to an explicit unknown block when only stream metadata is available", () => {
    const extractResult = extractConversationPayload(
      readSharedLinkFixture("live-stream-thread.fixture.html")
    );
    const transcript = normalizeTranscript(fetchResult, extractResult, baseOptions);

    expect(transcript.title).toBe("Story Time Practice");
    expect(transcript.turns).toHaveLength(1);
    expect(transcript.turns[0]).toMatchObject({
      role: "system",
      blocks: [
        {
          kind: "unknown",
          rawType: "react-router-stream",
          summary: "Structured transcript turns are not available for this extracted payload yet."
        }
      ]
    });
  });

  it("prefers an explicit CLI title over the extracted payload title", () => {
    const extractResult = extractConversationPayload(
      readSharedLinkFixture("plain-text-thread.fixture.html")
    );

    const transcript = normalizeTranscript(fetchResult, extractResult, {
      ...baseOptions,
      title: "My Exported Thread"
    });

    expect(transcript.title).toBe("My Exported Thread");
  });

  it("drops known internal artifact messages from live-style payloads", () => {
    const transcript = normalizeTranscript(
      fetchResult,
      {
        payload: {
          transport: "react-router-stream",
          title: "Artifact Cleanup Test",
          messages: [
            {
              id: "artifact-custom-instructions",
              role: "user",
              parts: [{ type: "text", text: "Original custom instructions no longer available" }]
            },
            {
              id: "artifact-context",
              role: "assistant",
              parts: [{ type: "model_editable_context" }]
            },
            {
              id: "artifact-empty-code",
              role: "assistant",
              parts: [{ type: "code", text: "" }]
            },
            {
              id: "real-user",
              role: "user",
              parts: [{ type: "text", text: "Please keep this turn." }]
            },
            {
              id: "real-assistant",
              role: "assistant",
              parts: [{ type: "text", text: "Keeping the real conversation content." }]
            }
          ]
        }
      },
      baseOptions
    );

    expect(transcript.turns).toMatchObject([
      {
        id: "real-user",
        role: "user",
        blocks: [{ kind: "text", text: "Please keep this turn." }]
      },
      {
        id: "real-assistant",
        role: "assistant",
        blocks: [{ kind: "text", text: "Keeping the real conversation content." }]
      }
    ]);
    expect(transcript.turns).toHaveLength(2);
  });
});
