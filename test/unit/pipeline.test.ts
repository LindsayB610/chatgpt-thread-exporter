import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPipelineArtifacts,
  emitPipelineOutputs,
  runCli,
  type PipelineDependencies
} from "../../src/pipeline.js";
import type { CliOptions, ExtractResult, FetchResult, PipelineArtifacts } from "../../src/types.js";

const tempDirs: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();

  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await rm(dir, { recursive: true, force: true });
    })
  );
});

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "chatgpt-thread-exporter-pipeline-"));
  tempDirs.push(dir);
  return dir;
}

function createDependencies(overrides: Partial<PipelineDependencies> = {}): PipelineDependencies {
  return {
    fetchSharedLink: vi.fn().mockResolvedValue({
      sourceUrl: "https://chatgpt.com/share/abc",
      finalUrl: "https://chatgpt.com/share/abc",
      status: 200,
      html: "<html>fixture</html>"
    } satisfies FetchResult),
    extractConversationPayload: vi.fn().mockReturnValue({
      payload: { thread: "fixture" },
      metadata: { strategy: "test" }
    } satisfies ExtractResult),
    normalizeTranscript: vi.fn().mockReturnValue({
      sourceUrl: "https://chatgpt.com/share/abc",
      finalUrl: "https://chatgpt.com/share/abc",
      exportedAt: "2026-04-08T00:00:00.000Z",
      title: "Fixture Thread",
      turns: []
    }),
    renderMarkdown: vi.fn().mockReturnValue("# Fixture Thread\n"),
    renderPdf: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])),
    writeLocalFile: vi.fn().mockResolvedValue(undefined),
    writeGitHubFile: vi.fn().mockResolvedValue(undefined),
    stdoutWrite: vi.fn(),
    ...overrides
  };
}

function createArtifacts(options: CliOptions = { url: "https://chatgpt.com/share/abc" }): PipelineArtifacts {
  return {
    options,
    fetchResult: {
      sourceUrl: "https://chatgpt.com/share/abc",
      finalUrl: "https://chatgpt.com/share/abc",
      status: 200,
      html: "<html>fixture</html>"
    },
    extractResult: {
      payload: { thread: "fixture" },
      metadata: { strategy: "test" }
    },
    transcript: {
      sourceUrl: "https://chatgpt.com/share/abc",
      finalUrl: "https://chatgpt.com/share/abc",
      exportedAt: "2026-04-08T00:00:00.000Z",
      title: "Fixture Thread",
      turns: []
    },
    outputFormat: "markdown",
    outputContent: "# Fixture Thread\n"
  };
}

describe("buildPipelineArtifacts", () => {
  it("wires the fetch, extract, normalize, and render stages in order", async () => {
    const order: string[] = [];
    const dependencies = createDependencies({
      fetchSharedLink: vi.fn().mockImplementation(async (url: string) => {
        order.push(`fetch:${url}`);
        return {
          sourceUrl: url,
          finalUrl: url,
          status: 200,
          html: "<html>fixture</html>"
        };
      }),
      extractConversationPayload: vi.fn().mockImplementation((html: string) => {
        order.push(`extract:${html}`);
        return {
          payload: { html }
        };
      }),
      normalizeTranscript: vi.fn().mockImplementation((fetchResult, extractResult, options) => {
        order.push(`normalize:${options.url}`);
        return {
          sourceUrl: fetchResult.sourceUrl,
          finalUrl: fetchResult.finalUrl,
          exportedAt: "2026-04-08T00:00:00.000Z",
          title: "Fixture Thread",
          turns: [
            {
              id: "1",
              role: "system",
              blocks: [{ kind: "unknown", summary: JSON.stringify(extractResult.payload) }]
            }
          ]
        };
      }),
      renderMarkdown: vi.fn().mockImplementation(() => {
        order.push("render");
        return "# Fixture Thread\n";
      }),
      renderPdf: vi.fn()
    });

    const artifacts = await buildPipelineArtifacts(
      {
        url: "https://chatgpt.com/share/abc"
      },
      dependencies
    );

    expect(order).toEqual([
      "fetch:https://chatgpt.com/share/abc",
      "extract:<html>fixture</html>",
      "normalize:https://chatgpt.com/share/abc",
      "render"
    ]);
    expect(artifacts.outputContent).toBe("# Fixture Thread\n");
    expect(artifacts.outputFormat).toBe("markdown");
    expect(artifacts.options.url).toBe("https://chatgpt.com/share/abc");
  });

  it("uses the PDF renderer when --format pdf is selected", async () => {
    const dependencies = createDependencies();

    const artifacts = await buildPipelineArtifacts(
      {
        url: "https://chatgpt.com/share/abc",
        format: "pdf"
      },
      dependencies
    );

    expect(dependencies.renderPdf).toHaveBeenCalled();
    expect(dependencies.renderMarkdown).not.toHaveBeenCalled();
    expect(artifacts.outputFormat).toBe("pdf");
    expect(artifacts.outputContent).toBeInstanceOf(Uint8Array);
  });
});

describe("emitPipelineOutputs", () => {
  it("writes debug artifacts during dry-run without writing transcript destinations", async () => {
    const dependencies = createDependencies();

    await emitPipelineOutputs(
      createArtifacts({
        url: "https://chatgpt.com/share/abc",
        dryRun: true,
        out: "./exports/thread.md",
        debugHtml: "./debug/thread.html",
        debugJson: "./debug/thread.json"
      }),
      dependencies
    );

    expect(dependencies.stdoutWrite).toHaveBeenCalledWith("# Fixture Thread\n");
    expect(dependencies.writeLocalFile).toHaveBeenCalledTimes(2);
    expect(dependencies.writeLocalFile).toHaveBeenNthCalledWith(
      1,
      "./debug/thread.html",
      "<html>fixture</html>",
      false
    );
    expect(dependencies.writeLocalFile).toHaveBeenNthCalledWith(
      2,
      "./debug/thread.json",
      expect.stringContaining('"status": 200'),
      false
    );
    expect(dependencies.writeGitHubFile).not.toHaveBeenCalled();
    expect(dependencies.writeLocalFile).not.toHaveBeenCalledWith(
      "./exports/thread.md",
      expect.anything(),
      false
    );
  });

  it("writes both local output and stdout when both are requested", async () => {
    const dependencies = createDependencies();

    await emitPipelineOutputs(
      createArtifacts({
        url: "https://chatgpt.com/share/abc",
        out: "./exports/thread.md",
        stdout: true
      }),
      dependencies
    );

    expect(dependencies.writeLocalFile).toHaveBeenCalledWith(
      "./exports/thread.md",
      "# Fixture Thread\n",
      false
    );
    expect(dependencies.writeGitHubFile).not.toHaveBeenCalled();
    expect(dependencies.stdoutWrite).toHaveBeenCalledWith("# Fixture Thread\n");
  });

  it("writes to a unique Downloads file by default when no destination flags are provided", async () => {
    const home = await createTempDir();
    vi.stubEnv("HOME", home);
    const dependencies = createDependencies();

    await emitPipelineOutputs(createArtifacts(), dependencies);

    expect(dependencies.writeLocalFile).toHaveBeenCalledWith(
      path.join(home, "Downloads", "fixture-thread-export.md"),
      "# Fixture Thread\n",
      false
    );
    expect(dependencies.stdoutWrite).toHaveBeenCalledWith(
      `Saved export to ${path.join(home, "Downloads", "fixture-thread-export.md")}\n`
    );
    expect(dependencies.writeGitHubFile).not.toHaveBeenCalled();
  });

  it("increments the default Downloads filename when one already exists", async () => {
    const home = await createTempDir();
    const downloadsDir = path.join(home, "Downloads");
    vi.stubEnv("HOME", home);
    await mkdir(downloadsDir, { recursive: true });
    await writeFile(path.join(downloadsDir, "fixture-thread-export.md"), "existing\n", "utf8");
    const dependencies = createDependencies();

    await emitPipelineOutputs(createArtifacts(), dependencies);

    expect(dependencies.writeLocalFile).toHaveBeenCalledWith(
      path.join(home, "Downloads", "fixture-thread-export-2.md"),
      "# Fixture Thread\n",
      false
    );
  });

  it("keeps debug artifacts when a later transcript destination write fails", async () => {
    const dependencies = createDependencies({
      writeLocalFile: vi.fn().mockImplementation(async (path: string) => {
        if (path === "./exports/thread.md") {
          throw new Error("disk full");
        }
      })
    });

    await expect(
      emitPipelineOutputs(
        createArtifacts({
          url: "https://chatgpt.com/share/abc",
          out: "./exports/thread.md",
          debugHtml: "./debug/thread.html"
        }),
        dependencies
      )
    ).rejects.toThrow("disk full");

    expect(dependencies.writeLocalFile).toHaveBeenNthCalledWith(
      1,
      "./debug/thread.html",
      "<html>fixture</html>",
      false
    );
    expect(dependencies.writeLocalFile).toHaveBeenNthCalledWith(
      2,
      "./exports/thread.md",
      "# Fixture Thread\n",
      false
    );
  });

  it("prints a confirmation after a successful GitHub export", async () => {
    const dependencies = createDependencies();

    await emitPipelineOutputs(
      createArtifacts({
        url: "https://chatgpt.com/share/abc",
        repo: "LindsayB610/chatgpt-thread-exporter",
        repoPath: "exports/thread.md"
      }),
      dependencies
    );

    expect(dependencies.writeGitHubFile).toHaveBeenCalledWith({
      repo: "LindsayB610/chatgpt-thread-exporter",
      repoPath: "exports/thread.md",
      branch: undefined,
      title: "Fixture Thread",
      content: "# Fixture Thread\n",
      force: false
    });
    expect(dependencies.stdoutWrite).toHaveBeenCalledWith(
      "Saved export to GitHub: LindsayB610/chatgpt-thread-exporter/exports/thread.md\n"
    );
  });

  it("writes a PDF file to Downloads by default when format is pdf", async () => {
    const home = await createTempDir();
    vi.stubEnv("HOME", home);
    const dependencies = createDependencies();

    await emitPipelineOutputs(
      {
        ...createArtifacts({
          url: "https://chatgpt.com/share/abc",
          format: "pdf"
        }),
        outputFormat: "pdf",
        outputContent: new Uint8Array([37, 80, 68, 70])
      },
      dependencies
    );

    expect(dependencies.writeLocalFile).toHaveBeenCalledWith(
      path.join(home, "Downloads", "fixture-thread-export.pdf"),
      new Uint8Array([37, 80, 68, 70]),
      false
    );
    expect(dependencies.stdoutWrite).toHaveBeenCalledWith(
      `Saved export to ${path.join(home, "Downloads", "fixture-thread-export.pdf")}\n`
    );
  });

  it("rejects GitHub export for PDF output for now", async () => {
    const dependencies = createDependencies();

    await expect(
      emitPipelineOutputs(
        {
          ...createArtifacts({
            url: "https://chatgpt.com/share/abc",
            format: "pdf",
            repo: "LindsayB610/chatgpt-thread-exporter",
            repoPath: "exports/thread.pdf"
          }),
          outputFormat: "pdf",
          outputContent: new Uint8Array([37, 80, 68, 70])
        },
        dependencies
      )
    ).rejects.toThrow("GitHub export currently supports markdown only");
  });
});

describe("runCli", () => {
  it("uses the stage dependencies through the top-level CLI path", async () => {
    const home = await createTempDir();
    vi.stubEnv("HOME", home);
    const dependencies = createDependencies();

    await runCli(["--url", "https://chatgpt.com/share/abc"], dependencies);

    expect(dependencies.fetchSharedLink).toHaveBeenCalledWith("https://chatgpt.com/share/abc");
    expect(dependencies.extractConversationPayload).toHaveBeenCalledWith("<html>fixture</html>");
    expect(dependencies.normalizeTranscript).toHaveBeenCalled();
    expect(dependencies.renderMarkdown).toHaveBeenCalled();
    expect(dependencies.writeLocalFile).toHaveBeenCalledWith(
      path.join(home, "Downloads", "fixture-thread-export.md"),
      "# Fixture Thread\n",
      false
    );
  });

  it("writes debug artifacts when extraction fails after fetch succeeds", async () => {
    const dependencies = createDependencies({
      extractConversationPayload: vi.fn().mockImplementation(() => {
        throw new Error("extract failed");
      })
    });

    await expect(runCli(["--url", "https://chatgpt.com/share/abc", "--debug-html", "./debug/thread.html", "--debug-json", "./debug/thread.json"], dependencies)).rejects.toThrow(
      "extract failed"
    );

    expect(dependencies.writeLocalFile).toHaveBeenNthCalledWith(
      1,
      "./debug/thread.html",
      "<html>fixture</html>",
      false
    );
    expect(dependencies.writeLocalFile).toHaveBeenNthCalledWith(
      2,
      "./debug/thread.json",
      expect.stringContaining('"stage": "extract"'),
      false
    );
    expect(dependencies.normalizeTranscript).not.toHaveBeenCalled();
    expect(dependencies.renderMarkdown).not.toHaveBeenCalled();
  });

  it("writes stage-specific debug errors for normalize failures", async () => {
    const dependencies = createDependencies({
      normalizeTranscript: vi.fn().mockImplementation(() => {
        throw new Error("normalize failed");
      })
    });

    await expect(
      runCli(
        [
          "--url",
          "https://chatgpt.com/share/abc",
          "--debug-json",
          "./debug/thread.json"
        ],
        dependencies
      )
    ).rejects.toThrow("normalize failed");

    expect(dependencies.writeLocalFile).toHaveBeenCalledWith(
      "./debug/thread.json",
      expect.stringContaining('"stage": "normalize"'),
      false
    );
    expect(dependencies.renderMarkdown).not.toHaveBeenCalled();
  });

  it("does not overwrite a successful debug artifact when a later output write fails", async () => {
    const dependencies = createDependencies({
      writeLocalFile: vi.fn().mockImplementation(async (path: string) => {
        if (path === "./exports/thread.md") {
          throw new Error("disk full");
        }
      })
    });

    await expect(
      runCli(
        [
          "--url",
          "https://chatgpt.com/share/abc",
          "--out",
          "./exports/thread.md",
          "--debug-json",
          "./debug/thread.json"
        ],
        dependencies
      )
    ).rejects.toThrow("disk full");

    expect(dependencies.writeLocalFile).toHaveBeenNthCalledWith(
      1,
      "./debug/thread.json",
      expect.stringContaining('"status": "success"'),
      false
    );
    expect(dependencies.writeLocalFile).toHaveBeenNthCalledWith(
      2,
      "./exports/thread.md",
      "# Fixture Thread\n",
      false
    );
    expect(dependencies.writeLocalFile).toHaveBeenCalledTimes(2);
  });

  it("does not let debug artifact write failures mask the original pipeline error", async () => {
    const dependencies = createDependencies({
      extractConversationPayload: vi.fn().mockImplementation(() => {
        throw new Error("extract failed");
      }),
      writeLocalFile: vi.fn().mockImplementation(async () => {
        throw new Error("debug path blocked");
      })
    });

    await expect(
      runCli(
        [
          "--url",
          "https://chatgpt.com/share/abc",
          "--debug-html",
          "./debug/thread.html",
          "--debug-json",
          "./debug/thread.json"
        ],
        dependencies
      )
    ).rejects.toThrow("extract failed");
  });
});
