import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type FixtureManifestEntry = {
  id: string;
  file: string;
  origin: "live-derived" | "synthetic";
  summary: string;
  sanitization: string;
};

const fixtureDir = path.resolve(import.meta.dirname, "../fixtures/shared-links");
const manifestPath = path.join(fixtureDir, "manifest.json");

describe("shared-link fixture catalog", () => {
  it("tracks the committed fixture set with sanitization notes", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as FixtureManifestEntry[];

    expect(manifest).toHaveLength(6);

    for (const entry of manifest) {
      expect(entry.id).toBeTruthy();
      expect(entry.origin).toBeTruthy();
      expect(entry.summary).toBeTruthy();
      expect(entry.sanitization).toBeTruthy();
      expect(existsSync(path.join(fixtureDir, entry.file))).toBe(true);
    }
  });

  it("contains real shared-link transport markers in the live-derived fixture", () => {
    const html = readFileSync(path.join(fixtureDir, "live-stream-thread.fixture.html"), "utf8");

    expect(html).toContain("window.__reactRouterContext.streamController.enqueue(");
    expect(html).toContain('"routes/share.$shareId.($action)"');
    expect(html).toContain("sharedConversationId");
    expect(html).toContain("serverResponse");
    expect(html).toContain("linear_conversation");
  });

  it("keeps the synthetic fixtures clearly marked as supplemental shapes", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as FixtureManifestEntry[];
    const syntheticEntries = manifest.filter((entry) => entry.origin === "synthetic");

    expect(syntheticEntries).toHaveLength(5);
  });
});
