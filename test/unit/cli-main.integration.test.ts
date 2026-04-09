import { describe, expect, it } from "vitest";
import { runCliMain } from "../../src/cli-main.js";

describe("runCliMain integration", () => {
  it("surfaces real argv validation failures on stderr and sets exit code 1", async () => {
    const stderrWrites: string[] = [];
    const exitCodes: number[] = [];

    await runCliMain(["--url"], {
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

    expect(stderrWrites).toEqual([
      "Missing value for --url. Expected a file path, URL, or string after the flag.\n"
    ]);
    expect(exitCodes).toEqual([1]);
  });
});
