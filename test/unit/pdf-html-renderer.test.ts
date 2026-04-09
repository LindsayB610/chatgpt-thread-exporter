import { describe, expect, it } from "vitest";
import { renderChatGptHtml } from "../../src/pdf/render-chatgpt-html.js";
import { extractConversationPayload } from "../../src/extractor.js";
import { normalizeTranscript } from "../../src/normalizer.js";
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

describe("renderChatGptHtml", () => {
  it("renders a complete HTML document with chatgpt-like structure", () => {
    const transcript = normalizeTranscript(
      fetchResult,
      extractConversationPayload(readSharedLinkFixture("plain-text-thread.fixture.html")),
      baseOptions
    );

    const html = renderChatGptHtml(transcript);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain('<main class="export-shell">');
    expect(html).toContain('<section class="conversation-thread">');
    expect(html).toContain('class="turn turn-user"');
    expect(html).toContain('class="turn turn-assistant"');
    expect(html).toContain('class="turn-bubble"');
    expect(html).toContain('class="turn-content"');
    expect(html).toContain("Planning a neighborhood potluck");
  });

  it("renders code blocks, unknown blocks, and attachments in dedicated surfaces", () => {
    const transcript = normalizeTranscript(
      fetchResult,
      extractConversationPayload(readSharedLinkFixture("rich-content-thread.fixture.html")),
      baseOptions
    );

    const html = renderChatGptHtml(transcript);

    expect(html).toContain('class="block block-unknown"');
    expect(html).toContain("Unsupported content: image_reference");
    expect(html).toContain('class="turn-attachments"');
    expect(html).toContain("hero-shortlist-1.jpg");
  });

  it("escapes HTML-sensitive content instead of injecting raw markup", () => {
    const html = renderChatGptHtml({
      sourceUrl: "https://chatgpt.com/share/example",
      finalUrl: "https://chatgpt.com/share/example",
      exportedAt: "2026-04-09T00:00:00.000Z",
      title: "<Unsafe Title>",
      turns: [
        {
          id: "user-1",
          role: "user",
          blocks: [{ kind: "text", text: "<script>alert('xss')</script>" }]
        }
      ]
    });

    expect(html).toContain("&lt;Unsafe Title&gt;");
    expect(html).toContain("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert('xss')</script>");
  });
});
