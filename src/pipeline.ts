import type { CliOptions, ExportTranscript } from "./types.js";
import { parseArgs, validateOptions } from "./utils/args.js";
import { fetchSharedLink } from "./fetcher.js";
import { extractConversationPayload } from "./extractor.js";
import { normalizeTranscript } from "./normalizer.js";
import { renderMarkdown } from "./renderer.js";
import { writeLocalFile } from "./writers/local.js";
import { writeGitHubFile } from "./writers/github.js";

export async function runCli(argv: string[]): Promise<void> {
  const options = parseArgs(argv);
  validateOptions(options);

  const fetchResult = await fetchSharedLink(options.url);
  const extractResult = extractConversationPayload(fetchResult.html);
  const transcript = normalizeTranscript(fetchResult, extractResult, options);
  const markdown = renderMarkdown(transcript);

  await emitOutputs(options, transcript, markdown);
}

async function emitOutputs(
  options: CliOptions,
  transcript: ExportTranscript,
  markdown: string
): Promise<void> {
  const shouldPrint = options.stdout || (!options.out && !options.repo);

  if (shouldPrint || options.dryRun) {
    process.stdout.write(markdown);
    if (!markdown.endsWith("\n")) {
      process.stdout.write("\n");
    }
  }

  if (options.dryRun) {
    return;
  }

  if (options.out) {
    await writeLocalFile(options.out, markdown, options.force === true);
  }

  if (options.repo && options.repoPath) {
    await writeGitHubFile({
      repo: options.repo,
      repoPath: options.repoPath,
      branch: options.branch,
      title: transcript.title,
      content: markdown,
      force: options.force === true
    });
  }
}
