import { runCli } from "./pipeline.js";

type CliIo = {
  stdout: Pick<typeof process.stdout, "write">;
  stderr: Pick<typeof process.stderr, "write">;
  setExitCode: (code: number) => void;
};

const HELP_TEXT = `chatgpt-thread-exporter

Usage:
  chatgpt-thread-exporter --url "https://chatgpt.com/share/..."

Default behavior:
  Saves a Markdown export to your Downloads folder with a unique title-based filename.

Common options:
  --stdout                 Print Markdown in Terminal instead of saving a default file
  --out <path>             Save to a specific Markdown file
  --repo <owner/name>      Write to a GitHub repository you control
  --repo-path <path>       Write to a specific repository path
  --branch <name>          Use a specific GitHub branch
  --force                  Overwrite an existing local or GitHub file
  --debug-html <path>      Save fetched page HTML for troubleshooting
  --debug-json <path>      Save structured debug info for troubleshooting
  --help                   Show this help text

GitHub export:
  Requires a GITHUB_TOKEN environment variable with access to the destination repo.
  Does not auto-create branches in v1.1.
`;

export async function runCliMain(
  argv: string[],
  io: CliIo = {
    stdout: process.stdout,
    stderr: process.stderr,
    setExitCode: (code: number) => {
      process.exitCode = code;
    }
  }
): Promise<void> {
  if (argv.includes("--help") || argv.includes("-h")) {
    io.stdout.write(`${HELP_TEXT}\n`);
    return;
  }

  try {
    await runCli(argv);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr.write(`${message}\n`);
    io.setExitCode(1);
  }
}
