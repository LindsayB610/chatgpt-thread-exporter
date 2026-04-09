import { afterEach, describe, expect, it, vi } from "vitest";
import { writeGitHubFile } from "../../src/writers/github.js";

describe("writeGitHubFile", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fails clearly when GITHUB_TOKEN is missing", async () => {
    await expect(
      writeGitHubFile({
        repo: "LindsayB610/chat-exports",
        repoPath: "exports/thread.md",
        title: "Example Thread",
        content: "# Example\n",
        force: false
      })
    ).rejects.toThrow(
      "GitHub write mode requires a GITHUB_TOKEN environment variable with access to the destination repo."
    );
  });

  it("creates a new GitHub file when the target does not already exist", async () => {
    vi.stubEnv("GITHUB_TOKEN", "test-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Not Found", { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ content: { path: "exports/thread.md" } }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await writeGitHubFile({
      repo: "LindsayB610/chat-exports",
      repoPath: "exports/thread.md",
      branch: "main",
      title: "Example Thread",
      content: "# Example\n",
      force: false
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.github.com/repos/LindsayB610/chat-exports/contents/exports/thread.md?ref=main",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token"
        })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/repos/LindsayB610/chat-exports/contents/exports/thread.md",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          message: "Export ChatGPT thread: Example Thread",
          content: Buffer.from("# Example\n", "utf8").toString("base64"),
          branch: "main"
        })
      })
    );
  });

  it("refuses to overwrite an existing GitHub file without --force", async () => {
    vi.stubEnv("GITHUB_TOKEN", "test-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: "existing-sha" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      writeGitHubFile({
        repo: "LindsayB610/chat-exports",
        repoPath: "exports/thread.md",
        title: "Example Thread",
        content: "# Example\n",
        force: false
      })
    ).rejects.toThrow(
      "Refusing to overwrite existing GitHub file without --force: LindsayB610/chat-exports/exports/thread.md"
    );
  });

  it("updates an existing GitHub file with its SHA when --force is set", async () => {
    vi.stubEnv("GITHUB_TOKEN", "test-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: "existing-sha" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ commit: { sha: "new-commit" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await writeGitHubFile({
      repo: "LindsayB610/chat-exports",
      repoPath: "exports/thread.md",
      title: "Example Thread",
      content: "# Example\n",
      force: true
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/repos/LindsayB610/chat-exports/contents/exports/thread.md",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          message: "Export ChatGPT thread: Example Thread",
          content: Buffer.from("# Example\n", "utf8").toString("base64"),
          sha: "existing-sha"
        })
      })
    );
  });

  it("surfaces clear auth failures from GitHub", async () => {
    vi.stubEnv("GITHUB_TOKEN", "test-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Bad credentials" }), { status: 401 })
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      writeGitHubFile({
        repo: "LindsayB610/chat-exports",
        repoPath: "exports/thread.md",
        title: "Example Thread",
        content: "# Example\n",
        force: false
      })
    ).rejects.toThrow(
      "GitHub rejected access to LindsayB610/chat-exports. Check GITHUB_TOKEN permissions and repo access. Bad credentials"
    );
  });

  it("surfaces actionable conflict failures from GitHub", async () => {
    vi.stubEnv("GITHUB_TOKEN", "test-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: "existing-sha" }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "sha does not match" }), { status: 409 })
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      writeGitHubFile({
        repo: "LindsayB610/chat-exports",
        repoPath: "exports/thread.md",
        title: "Example Thread",
        content: "# Example\n",
        force: true
      })
    ).rejects.toThrow(
      "GitHub could not write LindsayB610/chat-exports/exports/thread.md. Check the branch, path, and overwrite settings, then try again. sha does not match"
    );
  });
});
