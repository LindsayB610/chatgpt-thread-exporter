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

  validateLocalPath(options.out, "--out");
  validateLocalPath(options.debugHtml, "--debug-html");
  validateLocalPath(options.debugJson, "--debug-json");

  if (options.repo && !options.repoPath) {
    throw new Error("--repo requires --repo-path");
  }

  if (options.repoPath && !options.repo) {
    throw new Error("--repo-path requires --repo");
  }

  if (options.repo && !isRepoSlug(options.repo)) {
    throw new Error("--repo must be in the form owner/name");
  }

  if (options.repoPath) {
    validateRepoPath(options.repoPath);
  }

  if (options.branch && !options.repo) {
    throw new Error("--branch requires --repo");
  }
}

function readValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];

  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }

  return value;
}

function validateLocalPath(path: string | undefined, flag: string): void {
  if (path === undefined) {
    return;
  }

  if (path.trim().length === 0) {
    throw new Error(`${flag} requires a non-empty file path`);
  }

  if (path.endsWith("/") || path.endsWith("\\")) {
    throw new Error(`${flag} must point to a file, not a directory`);
  }

  const segments = path.split(/[\\/]+/).filter(Boolean);

  if (segments.length === 0) {
    throw new Error(`${flag} must point to a file, not a directory`);
  }

  if (segments.includes("..")) {
    throw new Error(`${flag} must not contain parent-directory traversal`);
  }

  if (path === "." || path === "..") {
    throw new Error(`${flag} must point to a file, not a directory`);
  }
}

function validateRepoPath(repoPath: string): void {
  if (repoPath.trim().length === 0) {
    throw new Error("--repo-path requires a non-empty repository-relative file path");
  }

  if (repoPath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(repoPath)) {
    throw new Error("--repo-path must be repository-relative");
  }

  if (repoPath.includes("\\")) {
    throw new Error("--repo-path must use forward slashes");
  }

  if (repoPath.includes("//")) {
    throw new Error("--repo-path must not contain repeated slashes");
  }

  if (repoPath.endsWith("/")) {
    throw new Error("--repo-path must point to a file, not a directory");
  }

  const segments = repoPath.split("/").filter(Boolean);

  if (segments.length === 0) {
    throw new Error("--repo-path must point to a file, not a directory");
  }

  if (segments.includes("..")) {
    throw new Error("--repo-path must not contain parent-directory traversal");
  }
}

function isRepoSlug(value: string): boolean {
  return /^[^/\s]+\/[^/\s]+$/.test(value);
}
