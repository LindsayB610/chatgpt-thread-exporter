import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { extractConversationPayload } from "../../src/extractor.js";
import { normalizeTranscript } from "../../src/normalizer.js";
import { runCli, type PipelineDependencies } from "../../src/pipeline.js";
import { renderMarkdown } from "../../src/renderer.js";
import { writeLocalFile } from "../../src/writers/local.js";
import { readSharedLinkFixture } from "../helpers/fixtures.js";

const tempDirs: string[] = [];
const renderedDir = path.resolve(import.meta.dirname, "../fixtures/rendered");

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "chatgpt-thread-exporter-"));
  tempDirs.push(dir);
  return dir;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllEnvs();

  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await rm(dir, { recursive: true, force: true });
    })
  );
});

function createDependencies(
  html: string,
  stdoutWrite: (chunk: string) => void
): PipelineDependencies {
  return {
    fetchSharedLink: vi.fn().mockResolvedValue({
      sourceUrl: "https://chatgpt.com/share/example",
      finalUrl: "https://chatgpt.com/share/example",
      status: 200,
      html
    }),
    extractConversationPayload,
    normalizeTranscript,
    renderMarkdown,
    writeLocalFile,
    writeGitHubFile: vi.fn().mockResolvedValue(undefined),
    stdoutWrite
  };
}

describe("local export integration", () => {
  it("writes a full local markdown export from fixture HTML without printing to stdout", async () => {
    const root = await createTempDir();
    const outPath = path.join(root, "exports", "thread.md");
    const stdoutWrites: string[] = [];

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00.000Z"));

    await runCli(
      [
        "--url",
        "https://chatgpt.com/share/example",
        "--out",
        outPath
      ],
      createDependencies(
        readSharedLinkFixture("code-block-thread.fixture.html"),
        (chunk) => stdoutWrites.push(chunk)
      )
    );

    const markdown = await readFile(outPath, "utf8");
    const expected = await readFile(path.join(renderedDir, "code-block-thread.md"), "utf8");

    expect(markdown).toBe(expected);
    expect(stdoutWrites).toEqual([]);
  });

  it("writes a default export into Downloads with a title-based unique filename", async () => {
    const home = await createTempDir();
    const downloadsPath = path.join(home, "Downloads", "planning-a-neighborhood-potluck-export.md");
    const stdoutWrites: string[] = [];

    vi.stubEnv("HOME", home);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00.000Z"));

    await runCli(
      ["--url", "https://chatgpt.com/share/example"],
      createDependencies(
        readSharedLinkFixture("plain-text-thread.fixture.html"),
        (chunk) => stdoutWrites.push(chunk)
      )
    );

    const markdown = await readFile(downloadsPath, "utf8");
    const expected = await readFile(path.join(renderedDir, "plain-text-thread.md"), "utf8");

    expect(markdown).toBe(expected);
    expect(stdoutWrites).toEqual([`Saved export to ${downloadsPath}\n`]);
  });

  it("keeps dry-run local-only by printing markdown and writing debug artifacts without creating the export file", async () => {
    const root = await createTempDir();
    const outPath = path.join(root, "exports", "thread.md");
    const debugHtmlPath = path.join(root, "debug", "thread.html");
    const debugJsonPath = path.join(root, "debug", "thread.json");
    const stdoutWrites: string[] = [];

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00.000Z"));

    await runCli(
      [
        "--url",
        "https://chatgpt.com/share/example",
        "--out",
        outPath,
        "--dry-run",
        "--debug-html",
        debugHtmlPath,
        "--debug-json",
        debugJsonPath
      ],
      createDependencies(
        readSharedLinkFixture("plain-text-thread.fixture.html"),
        (chunk) => stdoutWrites.push(chunk)
      )
    );

    expect(stdoutWrites.join("")).toBe(
      await readFile(path.join(renderedDir, "plain-text-thread.md"), "utf8")
    );
    await expect(readFile(debugHtmlPath, "utf8")).resolves.toContain("__NEXT_DATA__");
    await expect(readFile(debugJsonPath, "utf8")).resolves.toContain('"status": "success"');
    await expect(pathExists(outPath)).resolves.toBe(false);
  });
});
