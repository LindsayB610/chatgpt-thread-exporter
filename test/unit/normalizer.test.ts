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

  it("preserves extracted message timestamps on turns", () => {
    const transcript = normalizeTranscript(
      fetchResult,
      {
        payload: {
          transport: "react-router-stream",
          title: "Timestamp Test",
          messages: [
            {
              id: "user-1",
              role: "user",
              timestamp: "2026-04-08T12:00:00.000Z",
              parts: [{ type: "text", text: "First message" }]
            },
            {
              id: "assistant-1",
              role: "assistant",
              timestamp: "2026-04-08T12:15:00.000Z",
              parts: [{ type: "text", text: "Reply message" }]
            }
          ]
        }
      },
      baseOptions
    );

    expect(transcript.turns[0]?.timestamp).toBe("2026-04-08T12:00:00.000Z");
    expect(transcript.turns[1]?.timestamp).toBe("2026-04-08T12:15:00.000Z");
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
    expect(markdown).toContain("## ChatGPT");
    expect(markdown).toContain("```ts");
    expect(markdown).toContain("Here is a small helper.");
  });

  it("degrades unsupported content into explicit placeholders and attachment metadata", () => {
    const extractResult = extractConversationPayload(
      readSharedLinkFixture("rich-content-thread.fixture.html")
    );
    const transcript = normalizeTranscript(fetchResult, extractResult, baseOptions);
    const assistantTurn = transcript.turns[1];

    expect(assistantTurn.blocks).toEqual([
      {
        kind: "text",
        text: "The first image reads strongest because the subject has more separation from the background."
      }
    ]);
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

  it("strips inline research citation markers from text content", () => {
    const transcript = normalizeTranscript(
      fetchResult,
      {
        payload: {
          transport: "react-router-stream",
          title: "Citation Cleanup Test",
          messages: [
            {
              id: "assistant-1",
              role: "assistant",
              parts: [
                {
                  type: "text",
                  text: "A paragraph with a citation marker. citeturn123view0\n\n## Heading After Citation"
                }
              ]
            }
          ]
        }
      },
      baseOptions
    );

    expect(transcript.turns[0]?.blocks).toEqual([
      {
        kind: "text",
        text: "A paragraph with a citation marker.\n\n## Heading After Citation"
      }
    ]);
  });

  it("strips inline file citation markers from text content", () => {
    const transcript = normalizeTranscript(
      fetchResult,
      {
        payload: {
          transport: "react-router-stream",
          title: "File Citation Cleanup Test",
          messages: [
            {
              id: "assistant-1",
              role: "assistant",
              parts: [
                {
                  type: "text",
                  text: "Turning rambles into structured outputs (updates, plans, comms) 〖filecite〗turn0file1〗"
                }
              ]
            }
          ]
        }
      },
      baseOptions
    );

    expect(transcript.turns[0]?.blocks).toEqual([
      {
        kind: "text",
        text: "Turning rambles into structured outputs (updates, plans, comms)"
      }
    ]);
  });

  it("strips inline private-use file citation markers from text content", () => {
    const transcript = normalizeTranscript(
      fetchResult,
      {
        payload: {
          transport: "react-router-stream",
          title: "File Citation Cleanup Test",
          messages: [
            {
              id: "assistant-1",
              role: "assistant",
              parts: [
                {
                  type: "text",
                  text:
                    "Turning rambles into structured outputs (updates, plans, comms) " +
                    "\u{E200}filecite\u{E202}turn0file1\u{E201}"
                }
              ]
            }
          ]
        }
      },
      baseOptions
    );

    expect(transcript.turns[0]?.blocks).toEqual([
      {
        kind: "text",
        text: "Turning rambles into structured outputs (updates, plans, comms)"
      }
    ]);
  });

  it("turns multimodal_text parts into readable text plus attachment metadata", () => {
    const transcript = normalizeTranscript(
      fetchResult,
      {
        payload: {
          transport: "react-router-stream",
          title: "Multimodal Text Test",
          messages: [
            {
              id: "user-1",
              role: "user",
              parts: [
                {
                  type: "image_reference",
                  name: "Screenshot 2026-04-07 at 7.33.13 AM.png",
                  mimeType: "image/png",
                  url: "sediment://file_123"
                },
                {
                  type: "text",
                  text: "I am not wrong; this keeps happening in new threads."
                }
              ]
            }
          ]
        }
      },
      baseOptions
    );

    expect(transcript.turns).toMatchObject([
      {
        id: "user-1",
        role: "user",
        blocks: [{ kind: "text", text: "I am not wrong; this keeps happening in new threads." }],
        metadata: {
          attachments: [
            {
              name: "Screenshot 2026-04-07 at 7.33.13 AM.png",
              mimeType: "image/png",
              url: "sediment://file_123"
            }
          ]
        }
      }
    ]);
  });

  it("turns tool image-reference messages into assistant image blocks when a real image URL is available", () => {
    const transcript = normalizeTranscript(
      fetchResult,
      {
        payload: {
          transport: "react-router-stream",
          title: "Generated Image Test",
          messages: [
            {
              id: "tool-1",
              role: "tool",
              timestamp: "2026-04-08T13:00:00.000Z",
              parts: [
                {
                  type: "image_reference",
                  name: "Generated image: Friendly spaceship coloring page",
                  url: "https://example.com/friendly-spaceship.png"
                }
              ]
            }
          ]
        }
      },
      baseOptions
    );

    expect(transcript.turns).toEqual([
      {
        id: "tool-1",
        role: "assistant",
        timestamp: "2026-04-08T13:00:00.000Z",
        authorName: undefined,
        blocks: [
          {
            kind: "image",
            alt: "Generated image: Friendly spaceship coloring page",
            url: "https://example.com/friendly-spaceship.png"
          }
        ]
      }
    ]);
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
              id: "artifact-thoughts",
              role: "assistant",
              parts: [{ type: "thoughts" }]
            },
            {
              id: "artifact-reasoning-recap",
              role: "assistant",
              parts: [{ type: "reasoning_recap" }]
            },
            {
              id: "artifact-empty-code",
              role: "assistant",
              parts: [{ type: "code", text: "" }]
            },
            {
              id: "artifact-redacted-tool-output",
              role: "tool",
              parts: [{ type: "text", text: "The output of this plugin was redacted." }]
            },
            {
              id: "artifact-transient-status",
              role: "assistant",
              parts: [{ type: "text", text: "I’m tightening the draft before I answer." }]
            },
            {
              id: "artifact-following-tool-output",
              role: "tool",
              parts: [{ type: "text", text: "The output of this plugin was redacted." }]
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
