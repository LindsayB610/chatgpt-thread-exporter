import { describe, expect, it } from "vitest";
import { parseArgs, validateOptions } from "../../src/utils/args.js";

describe("parseArgs", () => {
  it("parses the core flag set", () => {
    const options = parseArgs([
      "--format",
      "markdown",
      "--url",
      "https://chatgpt.com/share/abc",
      "--out",
      "./exports/thread.md",
      "--stdout",
      "--dry-run",
      "--debug-html",
      "./debug/thread.html",
      "--debug-json",
      "./debug/thread.json",
      "--force"
    ]);

    expect(options).toEqual({
      format: "markdown",
      url: "https://chatgpt.com/share/abc",
      out: "./exports/thread.md",
      stdout: true,
      dryRun: true,
      debugHtml: "./debug/thread.html",
      debugJson: "./debug/thread.json",
      force: true
    });
  });

  it("fails on unknown flags", () => {
    expect(() => parseArgs(["--url", "https://chatgpt.com/share/abc", "--wat"])).toThrow(
      "Unknown argument: --wat. Run with the documented flags only."
    );
  });

  it("fails on unsupported format values", () => {
    expect(() =>
      parseArgs(["--format", "html", "--url", "https://chatgpt.com/share/abc"])
    ).toThrow('Unsupported value for --format: html. Use "markdown" or "pdf".');
  });

  it("fails when a flag that requires a value is missing one", () => {
    expect(() => parseArgs(["--url"])).toThrow(
      "Missing value for --url. Expected a file path, URL, or string after the flag."
    );
    expect(() => parseArgs(["--url", "https://chatgpt.com/share/abc", "--out"])).toThrow(
      "Missing value for --out. Expected a file path, URL, or string after the flag."
    );
    expect(() => parseArgs(["--url", "https://chatgpt.com/share/abc", "--repo"])).toThrow(
      "Missing value for --repo. Expected a file path, URL, or string after the flag."
    );
    expect(() =>
      parseArgs(["--url", "https://chatgpt.com/share/abc", "--repo-path"])
    ).toThrow("Missing value for --repo-path. Expected a file path, URL, or string after the flag.");
    expect(() =>
      parseArgs(["--url", "https://chatgpt.com/share/abc", "--debug-html"])
    ).toThrow("Missing value for --debug-html. Expected a file path, URL, or string after the flag.");
    expect(() =>
      parseArgs(["--url", "https://chatgpt.com/share/abc", "--debug-json"])
    ).toThrow("Missing value for --debug-json. Expected a file path, URL, or string after the flag.");
    expect(() => parseArgs(["--url", "https://chatgpt.com/share/abc", "--title"])).toThrow(
      "Missing value for --title. Expected a file path, URL, or string after the flag."
    );
    expect(() => parseArgs(["--url", "https://chatgpt.com/share/abc", "--branch"])).toThrow(
      "Missing value for --branch. Expected a file path, URL, or string after the flag."
    );
  });
});

describe("validateOptions", () => {
  it("accepts stdout-only usage with just a URL", () => {
    expect(() =>
      validateOptions({
        url: "https://chatgpt.com/share/abc"
      })
    ).not.toThrow();
  });

  it("accepts dry-run with debug artifacts", () => {
    expect(() =>
      validateOptions({
        url: "https://chatgpt.com/share/abc",
        dryRun: true,
        debugHtml: "./debug/thread.html",
        debugJson: "./debug/thread.json"
      })
    ).not.toThrow();
  });

  it("requires a URL", () => {
    expect(() => validateOptions({ url: "" })).toThrow("Missing required argument: --url");
  });

  it("requires repo-path when repo is provided", () => {
    expect(() =>
      validateOptions({
        url: "https://chatgpt.com/share/abc",
        repo: "LindsayB610/chat-exports"
      })
    ).toThrow("--repo requires --repo-path");
  });

  it("requires repo when repo-path is provided", () => {
    expect(() =>
      validateOptions({
        url: "https://chatgpt.com/share/abc",
        repoPath: "conversation-exports/thread.md"
      })
    ).toThrow("--repo-path requires --repo");
  });

  it("requires branch to be paired with repo mode", () => {
    expect(() =>
      validateOptions({
        url: "https://chatgpt.com/share/abc",
        branch: "feature/test"
      })
    ).toThrow("--branch requires --repo");
  });

  it("validates repo slug format", () => {
    expect(() =>
      validateOptions({
        url: "https://chatgpt.com/share/abc",
        repo: "LindsayB610",
        repoPath: "conversation-exports/thread.md"
      })
    ).toThrow("--repo must be in the form owner/name");
  });

  it("rejects directory-like local paths", () => {
    expect(() =>
      validateOptions({
        url: "https://chatgpt.com/share/abc",
        out: "./exports/"
      })
    ).toThrow("--out must point to a file, not a directory");
  });

  it("rejects parent traversal in local paths", () => {
    expect(() =>
      validateOptions({
        url: "https://chatgpt.com/share/abc",
        out: "../thread.md"
      })
    ).toThrow("--out must not contain parent-directory traversal");
  });

  it("rejects invalid repo-path traversal", () => {
    expect(() =>
      validateOptions({
        url: "https://chatgpt.com/share/abc",
        repo: "LindsayB610/chat-exports",
        repoPath: "../thread.md"
      })
    ).toThrow("--repo-path must not contain parent-directory traversal");
  });

  it("rejects absolute-style repo paths", () => {
    expect(() =>
      validateOptions({
        url: "https://chatgpt.com/share/abc",
        repo: "LindsayB610/chat-exports",
        repoPath: "/thread.md"
      })
    ).toThrow("--repo-path must be repository-relative");
  });

  it("rejects windows-style absolute repo paths", () => {
    expect(() =>
      validateOptions({
        url: "https://chatgpt.com/share/abc",
        repo: "LindsayB610/chat-exports",
        repoPath: "C:/thread.md"
      })
    ).toThrow("--repo-path must be repository-relative");
  });

  it("rejects backslash-separated repo paths", () => {
    expect(() =>
      validateOptions({
        url: "https://chatgpt.com/share/abc",
        repo: "LindsayB610/chat-exports",
        repoPath: "conversation-exports\\thread.md"
      })
    ).toThrow("--repo-path must use forward slashes");
  });

  it("rejects repo paths with repeated slashes", () => {
    expect(() =>
      validateOptions({
        url: "https://chatgpt.com/share/abc",
        repo: "LindsayB610/chat-exports",
        repoPath: "conversation-exports//thread.md"
      })
    ).toThrow("--repo-path must not contain repeated slashes");
  });

  it("accepts combined local output and stdout behavior", () => {
    expect(() =>
      validateOptions({
        url: "https://chatgpt.com/share/abc",
        out: "./exports/thread.md",
        stdout: true
      })
    ).not.toThrow();
  });

  it("rejects stdout for pdf output", () => {
    expect(() =>
      validateOptions({
        url: "https://chatgpt.com/share/abc",
        format: "pdf",
        stdout: true
      })
    ).toThrow("--stdout is only supported for markdown output right now");
  });
});
