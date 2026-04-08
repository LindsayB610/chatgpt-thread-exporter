import { beforeEach, describe, expect, it, vi } from "vitest";

const runCliMock = vi.fn();

vi.mock("../../src/pipeline.js", () => ({
  runCli: runCliMock
}));

describe("runCliMain", () => {
  beforeEach(() => {
    runCliMock.mockReset();
  });

  it("does not set a non-zero exit code on success", async () => {
    runCliMock.mockResolvedValue(undefined);

    const stderrWrites: string[] = [];
    const exitCodes: number[] = [];

    const { runCliMain } = await import("../../src/cli-main.js");

    await runCliMain(["--url", "https://chatgpt.com/share/abc"], {
      stderr: {
        write: (chunk: string) => {
          stderrWrites.push(chunk);
          return true;
        }
      },
      setExitCode: (code) => {
        exitCodes.push(code);
      }
    });

    expect(stderrWrites).toEqual([]);
    expect(exitCodes).toEqual([]);
    expect(runCliMock).toHaveBeenCalledWith(["--url", "https://chatgpt.com/share/abc"]);
  });

  it("writes a single error line to stderr and sets exit code 1 on failure", async () => {
    runCliMock.mockRejectedValue(new Error("Missing required argument: --url"));

    const stderrWrites: string[] = [];
    const exitCodes: number[] = [];

    const { runCliMain } = await import("../../src/cli-main.js");

    await runCliMain([], {
      stderr: {
        write: (chunk: string) => {
          stderrWrites.push(chunk);
          return true;
        }
      },
      setExitCode: (code) => {
        exitCodes.push(code);
      }
    });

    expect(stderrWrites).toEqual(["Missing required argument: --url\n"]);
    expect(exitCodes).toEqual([1]);
  });
});
