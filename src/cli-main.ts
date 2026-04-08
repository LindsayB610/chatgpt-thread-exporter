import { runCli } from "./pipeline.js";

type CliIo = {
  stderr: Pick<typeof process.stderr, "write">;
  setExitCode: (code: number) => void;
};

export async function runCliMain(
  argv: string[],
  io: CliIo = {
    stderr: process.stderr,
    setExitCode: (code: number) => {
      process.exitCode = code;
    }
  }
): Promise<void> {
  try {
    await runCli(argv);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr.write(`${message}\n`);
    io.setExitCode(1);
  }
}
