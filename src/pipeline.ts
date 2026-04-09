import type {
  CliOptions,
  DebugArtifactPayload,
  ExportTranscript,
  ExtractResult,
  FetchResult,
  PipelineArtifacts
} from "./types.js";
import { buildDebugArtifactErrorPayload, buildDebugArtifactPayload } from "./debug.js";
import { parseArgs, validateOptions } from "./utils/args.js";
import { resolveDefaultOutPath } from "./utils/output-path.js";
import { fetchSharedLink } from "./fetcher.js";
import { extractConversationPayload } from "./extractor.js";
import { normalizeTranscript } from "./normalizer.js";
import { renderMarkdown } from "./renderer.js";
import { renderPdf } from "./pdf/render-pdf.js";
import {
  hasDomEnrichableParts,
  injectResolvedShareArtifacts,
  resolveRenderedShareArtifacts
} from "./dom/share-dom-enrichment.js";
import { writeLocalFile } from "./writers/local.js";
import { writeGitHubFile } from "./writers/github.js";

class PipelineStageError extends Error {
  stage: "extract" | "normalize" | "render";
  causeValue: unknown;

  constructor(stage: "extract" | "normalize" | "render", causeValue: unknown) {
    super(causeValue instanceof Error ? causeValue.message : String(causeValue));
    this.name = "PipelineStageError";
    this.stage = stage;
    this.causeValue = causeValue;
  }
}

export type PipelineDependencies = {
  fetchSharedLink: typeof fetchSharedLink;
  extractConversationPayload: typeof extractConversationPayload;
  normalizeTranscript: typeof normalizeTranscript;
  renderMarkdown: typeof renderMarkdown;
  renderPdf: typeof renderPdf;
  resolveRenderedShareArtifacts: typeof resolveRenderedShareArtifacts;
  writeLocalFile: typeof writeLocalFile;
  writeGitHubFile: typeof writeGitHubFile;
  stdoutWrite: (chunk: string) => void;
};

export const defaultPipelineDependencies: PipelineDependencies = {
  fetchSharedLink,
  extractConversationPayload,
  normalizeTranscript,
  renderMarkdown,
  renderPdf,
  resolveRenderedShareArtifacts,
  writeLocalFile,
  writeGitHubFile,
  stdoutWrite: (chunk: string) => {
    process.stdout.write(chunk);
  }
};

export async function runCli(
  argv: string[],
  dependencies: PipelineDependencies = defaultPipelineDependencies
): Promise<void> {
  const options = parseArgs(argv);
  validateOptions(options);

  const fetchResult = await dependencies.fetchSharedLink(options.url);

  const artifacts = await buildPipelineArtifactsFromFetchResult(options, fetchResult, dependencies).catch(
    async (error: unknown) => {
      if (error instanceof PipelineStageError) {
        try {
          await writeDebugArtifacts(
            options,
            fetchResult,
            buildDebugArtifactErrorPayload(fetchResult, error.stage, error.causeValue),
            dependencies.writeLocalFile
          );
        } catch {
          // Debug artifacts are best-effort diagnostics and must not mask the original failure.
        }
      }

      throw error instanceof PipelineStageError ? error.causeValue : error;
    }
  );

  try {
    await emitPipelineOutputs(artifacts, dependencies);
  } catch (error: unknown) {
    throw error;
  }
}

export async function buildPipelineArtifacts(
  options: CliOptions,
  dependencies: Pick<
    PipelineDependencies,
    | "fetchSharedLink"
    | "extractConversationPayload"
    | "normalizeTranscript"
    | "renderMarkdown"
    | "renderPdf"
    | "resolveRenderedShareArtifacts"
  > = defaultPipelineDependencies
): Promise<PipelineArtifacts> {
  const fetchResult = await dependencies.fetchSharedLink(options.url);
  return buildPipelineArtifactsFromFetchResult(options, fetchResult, dependencies);
}

export async function buildPipelineArtifactsFromFetchResult(
  options: CliOptions,
  fetchResult: FetchResult,
  dependencies: Pick<
    PipelineDependencies,
    | "extractConversationPayload"
    | "normalizeTranscript"
    | "renderMarkdown"
    | "renderPdf"
    | "resolveRenderedShareArtifacts"
  > = defaultPipelineDependencies
): Promise<PipelineArtifacts> {
  let extractResult: ExtractResult;
  try {
    extractResult = dependencies.extractConversationPayload(fetchResult.html);
  } catch (error: unknown) {
    throw new PipelineStageError("extract", error);
  }

  if (
    "resolveRenderedShareArtifacts" in dependencies &&
    hasDomEnrichableParts(extractResult)
  ) {
    try {
      const artifacts = await dependencies.resolveRenderedShareArtifacts(fetchResult.finalUrl);
      extractResult = injectResolvedShareArtifacts(extractResult, artifacts);
    } catch {
      // Best-effort enrichment for visible share artifacts.
    }
  }

  let transcript: ExportTranscript;
  try {
    transcript = dependencies.normalizeTranscript(fetchResult, extractResult, options);
  } catch (error: unknown) {
    throw new PipelineStageError("normalize", error);
  }

  const outputFormat = options.format ?? "markdown";
  let outputContent: string | Uint8Array;
  try {
    outputContent =
      outputFormat === "pdf"
        ? await dependencies.renderPdf(transcript)
        : dependencies.renderMarkdown(transcript);
  } catch (error: unknown) {
    throw new PipelineStageError("render", error);
  }

  return {
    options,
    fetchResult,
    extractResult,
    transcript,
    outputFormat,
    outputContent
  };
}

export async function emitPipelineOutputs(
  artifacts: PipelineArtifacts,
  dependencies: Pick<PipelineDependencies, "writeLocalFile" | "writeGitHubFile" | "stdoutWrite"> =
    defaultPipelineDependencies
): Promise<void> {
  const { options, transcript, outputContent, outputFormat, fetchResult, extractResult } = artifacts;
  const shouldAutoSaveDefaultFile =
    !options.dryRun && !options.stdout && !options.out && !options.repo;
  const resolvedOutPath = shouldAutoSaveDefaultFile
    ? await resolveDefaultOutPath(transcript.title, outputFormat === "pdf" ? "pdf" : "md")
    : options.out;
  const shouldPrintMarkdown = outputFormat === "markdown" && (options.stdout || options.dryRun);

  if (shouldPrintMarkdown) {
    dependencies.stdoutWrite(outputContent as string);
    if (!(outputContent as string).endsWith("\n")) {
      dependencies.stdoutWrite("\n");
    }
  }

  await writeDebugArtifacts(
    options,
    fetchResult,
    buildDebugArtifactPayload(fetchResult, extractResult),
    dependencies.writeLocalFile
  );

  if (options.dryRun) {
    return;
  }

  if (resolvedOutPath) {
    await dependencies.writeLocalFile(resolvedOutPath, outputContent, options.force === true);
  }

  if (shouldAutoSaveDefaultFile && resolvedOutPath) {
    dependencies.stdoutWrite(`Saved export to ${resolvedOutPath}\n`);
  }

  if (options.repo && options.repoPath) {
    if (outputFormat !== "markdown" || typeof outputContent !== "string") {
      throw new Error("GitHub export currently supports markdown only");
    }

    await dependencies.writeGitHubFile({
      repo: options.repo,
      repoPath: options.repoPath,
      branch: options.branch,
      title: transcript.title,
      content: outputContent,
      force: options.force === true
    });

    dependencies.stdoutWrite(`Saved export to GitHub: ${options.repo}/${options.repoPath}\n`);
  }
}

async function writeDebugArtifacts(
  options: CliOptions,
  fetchResult: FetchResult,
  debugPayload: DebugArtifactPayload,
  localWriter: typeof writeLocalFile
): Promise<void> {
  const force = options.force === true;

  if (options.debugHtml) {
    await localWriter(options.debugHtml, fetchResult.html, force);
  }

  if (options.debugJson) {
    const payload = JSON.stringify(debugPayload, null, 2);

    await localWriter(options.debugJson, `${payload}\n`, force);
  }
}
