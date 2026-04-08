import { describe, expect, it, vi } from "vitest";
import {
  buildPipelineArtifacts,
  emitPipelineOutputs,
  runCli,
  type PipelineDependencies
} from "../../src/pipeline.js";
import type { CliOptions, ExtractResult, FetchResult, PipelineArtifacts } from "../../src/types.js";

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
    markdown: "# Fixture Thread\n"
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
      })
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
    expect(artifacts.markdown).toBe("# Fixture Thread\n");
    expect(artifacts.options.url).toBe("https://chatgpt.com/share/abc");
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

  it("prints to stdout by default when no destination flags are provided", async () => {
    const dependencies = createDependencies();

    await emitPipelineOutputs(createArtifacts(), dependencies);

    expect(dependencies.stdoutWrite).toHaveBeenCalledWith("# Fixture Thread\n");
    expect(dependencies.writeLocalFile).not.toHaveBeenCalled();
    expect(dependencies.writeGitHubFile).not.toHaveBeenCalled();
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
});

describe("runCli", () => {
  it("uses the stage dependencies through the top-level CLI path", async () => {
    const dependencies = createDependencies();

    await runCli(["--url", "https://chatgpt.com/share/abc"], dependencies);

    expect(dependencies.fetchSharedLink).toHaveBeenCalledWith("https://chatgpt.com/share/abc");
    expect(dependencies.extractConversationPayload).toHaveBeenCalledWith("<html>fixture</html>");
    expect(dependencies.normalizeTranscript).toHaveBeenCalled();
    expect(dependencies.renderMarkdown).toHaveBeenCalled();
    expect(dependencies.stdoutWrite).toHaveBeenCalledWith("# Fixture Thread\n");
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
