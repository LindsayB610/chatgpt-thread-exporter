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
      stdout: {
        write: () => true
      },
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
      stdout: {
        write: () => true
      },
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

  it("prints help text without running the pipeline", async () => {
    const stdoutWrites: string[] = [];
    const stderrWrites: string[] = [];
    const exitCodes: number[] = [];

    const { runCliMain } = await import("../../src/cli-main.js");

    await runCliMain(["--help"], {
      stdout: {
        write: (chunk: string) => {
          stdoutWrites.push(chunk);
          return true;
        }
      },
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

    expect(stdoutWrites.join("")).toContain("Default behavior:");
    expect(stdoutWrites.join("")).toContain("Downloads folder");
    expect(stdoutWrites.join("")).toContain("--format <markdown|pdf>");
    expect(stdoutWrites.join("")).toContain("npx playwright install chromium");
    expect(stderrWrites).toEqual([]);
    expect(exitCodes).toEqual([]);
    expect(runCliMock).not.toHaveBeenCalled();
  });
});
