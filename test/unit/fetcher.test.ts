import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSharedLink } from "../../src/fetcher.js";

describe("fetchSharedLink", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects invalid URLs before attempting fetch", async () => {
    await expect(fetchSharedLink("not-a-url")).rejects.toThrow(
      "Invalid URL: --url must be a valid absolute URL"
    );
  });

  it("rejects non-http urls", async () => {
    await expect(fetchSharedLink("file:///tmp/thread.html")).rejects.toThrow(
      "Invalid URL: --url must use http or https"
    );
  });

  it("passes a user-agent and returns normalized fetch metadata", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response("<html>ok</html>", {
          status: 200,
          headers: { "content-type": "text/html" }
        })
      );

    const result = await fetchSharedLink("https://chatgpt.com/share/abc");

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://chatgpt.com/share/abc"),
      expect.objectContaining({
        redirect: "follow",
        headers: {
          "user-agent": "chatgpt-thread-exporter"
        }
      })
    );
    expect(result.sourceUrl).toBe("https://chatgpt.com/share/abc");
    expect(result.status).toBe(200);
    expect(result.html).toBe("<html>ok</html>");
  });

  it("surfaces http failures clearly", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("nope", {
        status: 403
      })
    );

    await expect(fetchSharedLink("https://chatgpt.com/share/abc")).rejects.toThrow(
      "Failed to fetch shared link: HTTP 403"
    );
  });

  it("surfaces timeout failures clearly", async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }) as Promise<Response>
    );

    try {
      const promise = fetchSharedLink("https://chatgpt.com/share/abc");
      const assertion = expect(promise).rejects.toThrow(
        "Failed to fetch shared link: request timed out after 15000ms"
      );

      await vi.advanceTimersByTimeAsync(15000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
