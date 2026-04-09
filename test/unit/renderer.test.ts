import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../src/renderer.js";
import type { ExportTranscript } from "../../src/types.js";

describe("renderMarkdown", () => {
  it("renders code and text blocks into markdown", () => {
    const transcript: ExportTranscript = {
      sourceUrl: "https://chatgpt.com/share/abc",
      finalUrl: "https://chatgpt.com/share/abc",
      exportedAt: "2026-04-08T00:00:00.000Z",
      title: "Fixture",
      turns: [
        {
          id: "1",
          role: "assistant",
          blocks: [
            { kind: "text", text: "Hello" },
            { kind: "code", text: 'console.log("hi")', language: "ts" }
          ]
        }
      ]
    };

    expect(renderMarkdown(transcript)).toContain("```ts");
    expect(renderMarkdown(transcript)).toContain('console.log("hi")');
  });

  it("renders image blocks into markdown image syntax", () => {
    const transcript: ExportTranscript = {
      sourceUrl: "https://chatgpt.com/share/abc",
      finalUrl: "https://chatgpt.com/share/abc",
      exportedAt: "2026-04-08T00:00:00.000Z",
      title: "Fixture",
      turns: [
        {
          id: "1",
          role: "assistant",
          blocks: [
            {
              kind: "image",
              alt: "Generated image: Friendly spaceship coloring page",
              url: "https://example.com/friendly-spaceship.png"
            }
          ]
        }
      ]
    };

    expect(renderMarkdown(transcript)).toContain(
      "![Generated image: Friendly spaceship coloring page](https://example.com/friendly-spaceship.png)"
    );
  });
});
