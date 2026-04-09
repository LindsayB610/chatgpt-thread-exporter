import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { extractConversationPayload } from "../../src/extractor.js";
import { normalizeTranscript } from "../../src/normalizer.js";
import { renderMarkdown } from "../../src/renderer.js";
import type { CliOptions, FetchResult } from "../../src/types.js";
import { readSharedLinkFixture } from "../helpers/fixtures.js";

const renderedDir = path.resolve(import.meta.dirname, "../fixtures/rendered");

const fetchResult: FetchResult = {
  sourceUrl: "https://chatgpt.com/share/example",
  finalUrl: "https://chatgpt.com/share/example",
  status: 200,
  html: "<html></html>"
};

const baseOptions: CliOptions = {
  url: "https://chatgpt.com/share/example"
};

const cases = [
  ["plain-text-thread.fixture.html", "plain-text-thread.md"],
  ["code-block-thread.fixture.html", "code-block-thread.md"],
  ["rich-content-thread.fixture.html", "rich-content-thread.md"],
  ["partial-thread.fixture.html", "partial-thread.md"],
  ["live-stream-thread.fixture.html", "live-stream-thread.md"]
] as const;

describe("renderMarkdown golden outputs", () => {
  it.each(cases)("renders %s deterministically", (fixtureFile, goldenFile) => {
    const html = readSharedLinkFixture(fixtureFile);
    const extractResult = extractConversationPayload(html);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00.000Z"));

    const transcript = normalizeTranscript(fetchResult, extractResult, baseOptions);
    const markdown = renderMarkdown(transcript);

    vi.useRealTimers();

    const expected = readFileSync(path.join(renderedDir, goldenFile), "utf8");
    expect(markdown).toBe(expected);
  });
});
