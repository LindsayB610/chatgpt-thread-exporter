import type { CliOptions } from "../types.js";

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { url: "" };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case "--url":
        options.url = readValue(argv, ++index, "--url");
        break;
      case "--stdout":
        options.stdout = true;
        break;
      case "--out":
        options.out = readValue(argv, ++index, "--out");
        break;
      case "--repo":
        options.repo = readValue(argv, ++index, "--repo");
        break;
      case "--repo-path":
        options.repoPath = readValue(argv, ++index, "--repo-path");
        break;
      case "--title":
        options.title = readValue(argv, ++index, "--title");
        break;
      case "--branch":
        options.branch = readValue(argv, ++index, "--branch");
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--debug-html":
        options.debugHtml = readValue(argv, ++index, "--debug-html");
        break;
      case "--debug-json":
        options.debugJson = readValue(argv, ++index, "--debug-json");
        break;
      case "--force":
        options.force = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

export function validateOptions(options: CliOptions): void {
  if (!options.url) {
    throw new Error("Missing required argument: --url");
  }

  if (options.repo && !options.repoPath) {
    throw new Error("--repo requires --repo-path");
  }

  if (options.repoPath && !options.repo) {
    throw new Error("--repo-path requires --repo");
  }
}

function readValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];

  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }

  return value;
}
