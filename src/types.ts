export type ExportBlock =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string; language?: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "unknown"; rawType?: string; summary: string };

export type AttachmentReference = {
  name?: string;
  mimeType?: string;
  url?: string;
};

export type ExportTurn = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  blocks: ExportBlock[];
  timestamp?: string;
  authorName?: string;
  metadata?: {
    attachments?: AttachmentReference[];
    source?: Record<string, unknown>;
  };
};

export type ExportTranscript = {
  sourceUrl: string;
  finalUrl: string;
  exportedAt: string;
  title: string;
  turns: ExportTurn[];
};

export type CliOptions = {
  url: string;
  stdout?: boolean;
  out?: string;
  repo?: string;
  repoPath?: string;
  title?: string;
  branch?: string;
  dryRun?: boolean;
  debugHtml?: string;
  debugJson?: string;
  force?: boolean;
};

export type FetchResult = {
  sourceUrl: string;
  finalUrl: string;
  status: number;
  html: string;
};

export type ExtractResult = {
  payload: unknown;
  metadata?: Record<string, unknown>;
};

export type DebugFetchSnapshot = Omit<FetchResult, "html">;

export type DebugExtractSnapshot =
  | {
      status: "success";
      result: ExtractResult;
    }
  | {
      status: "error";
      stage: "extract" | "normalize" | "render";
      error: {
        name: string;
        message: string;
      };
    };

export type DebugArtifactPayload = {
  fetch: DebugFetchSnapshot;
  extract: DebugExtractSnapshot;
};

export type PipelineArtifacts = {
  options: CliOptions;
  fetchResult: FetchResult;
  extractResult: ExtractResult;
  transcript: ExportTranscript;
  markdown: string;
};
