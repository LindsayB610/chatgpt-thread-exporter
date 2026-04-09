import type { ExtractResult } from "./types.js";

export function extractConversationPayload(html: string): ExtractResult {
  if (!html.trim()) {
    throw new Error("Shared-link page was empty.");
  }

  const streamPayload = extractReactRouterStreamPayload(html);
  if (streamPayload) {
    return streamPayload;
  }

  const nextDataPayload = extractNextDataPayload(html);
  if (nextDataPayload) {
    return nextDataPayload;
  }

  throw new Error(
    "Could not find a supported shared-link payload. Expected a React Router stream payload or a __NEXT_DATA__ script."
  );
}

function extractReactRouterStreamPayload(html: string): ExtractResult | null {
  const decodedChunks = extractReactRouterDecodedChunks(html);
  if (decodedChunks.length === 0) {
    return null;
  }

  const decodedStream = decodedChunks.join("\n");
  const firstJsonChunk = decodedChunks.find((chunk) => chunk.trim().startsWith("["));

  const sharedConversationId = requireMatch(
    decodedStream,
    /"sharedConversationId","([^"]+)"/u,
    "shared conversation id"
  );
  const shareRegion = narrowToShareRegion(decodedStream);
  const shareTail = narrowToShareTail(decodedStream);
  const title = requireLastMatch(shareRegion, /"title","([^"]+)"/gu, "stream title");
  const messages = firstJsonChunk ? extractReactRouterMessages(firstJsonChunk) : [];

  return {
    payload: {
      transport: "react-router-stream",
      title,
      sharedConversationId,
      messages,
      isPartial: false,
      continueConversationUrl: optionalMatch(
        shareTail,
        /"continue_conversation_url","([^"]+)"/u
      ),
      backingConversationId: optionalMatch(
        shareTail,
        /"backing_conversation_id","([^"]+)"/u
      ),
      linearConversation: extractLinearConversation(shareTail)
    },
    metadata: {
      strategy: "react-router-stream-regex",
      streamLength: decodedStream.length,
      chunkCount: decodedChunks.length
    }
  };
}

function extractNextDataPayload(html: string): ExtractResult | null {
  const match = html.match(
    /<script[^>]+id="__NEXT_DATA__"[^>]*>\s*([\s\S]*?)\s*<\/script>/u
  );

  if (!match) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch (error) {
    throw new Error(
      `Found __NEXT_DATA__ script but its JSON could not be parsed: ${getErrorMessage(error)}`
    );
  }

  const root = parsed as {
    props?: {
      pageProps?: {
        sharedConversation?: {
          title?: string;
          messages?: unknown[];
          isPartial?: boolean;
        };
      };
    };
  };

  const sharedConversation = root.props?.pageProps?.sharedConversation;
  if (!sharedConversation) {
    throw new Error("Found __NEXT_DATA__ script but sharedConversation was missing.");
  }

  return {
    payload: {
      transport: "next-data",
      title: sharedConversation.title ?? null,
      messages: sharedConversation.messages ?? [],
      isPartial: sharedConversation.isPartial ?? false
    },
    metadata: {
      strategy: "next-data-json"
    }
  };
}

function extractLinearConversation(decodedStream: string): number[] {
  const match = decodedStream.match(/"linear_conversation",\[([^\]]*)\]/u);
  if (!match) {
    return [];
  }

  return match[1]
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function requireMatch(source: string, pattern: RegExp, label: string): string {
  const value = optionalMatch(source, pattern);
  if (!value) {
    throw new Error(`Found React Router stream payload but could not extract ${label}.`);
  }

  return value;
}

function requireLastMatch(source: string, pattern: RegExp, label: string): string {
  const value = lastMatch(source, pattern);
  if (!value) {
    throw new Error(`Found React Router stream payload but could not extract ${label}.`);
  }

  return value;
}

function optionalMatch(source: string, pattern: RegExp): string | null {
  return source.match(pattern)?.[1] ?? null;
}

function lastMatch(source: string, pattern: RegExp): string | null {
  let last: string | null = null;

  for (const match of source.matchAll(pattern)) {
    last = match[1] ?? null;
  }

  return last;
}

function decodeJavaScriptStringLiteral(value: string): string {
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\");
  }
}

function extractReactRouterDecodedChunks(html: string): string[] {
  const needle = "window.__reactRouterContext.streamController.enqueue(";
  let searchIndex = 0;
  const decodedChunks: string[] = [];

  while (searchIndex < html.length) {
    const start = html.indexOf(needle, searchIndex);
    if (start === -1) {
      break;
    }

    const openingQuote = html.indexOf('"', start + needle.length);
    if (openingQuote === -1) {
      break;
    }

    const parsed = readQuotedJavaScriptString(html, openingQuote);
    if (!parsed) {
      throw new Error("Found React Router stream payload but could not decode its JavaScript string.");
    }

    decodedChunks.push(parsed.value);
    searchIndex = parsed.nextIndex;
  }

  return decodedChunks;
}

function narrowToShareRegion(decodedStream: string): string {
  const sharedConversationIndex = decodedStream.indexOf('"sharedConversationId"');
  if (sharedConversationIndex === -1) {
    return decodedStream;
  }

  return decodedStream.slice(Math.max(0, sharedConversationIndex - 256));
}

function narrowToShareTail(decodedStream: string): string {
  const sharedConversationIndex = decodedStream.indexOf('"sharedConversationId"');
  if (sharedConversationIndex === -1) {
    return decodedStream;
  }

  return decodedStream.slice(sharedConversationIndex);
}

function extractReactRouterMessages(streamJson: string): Array<{
  id: string;
  role: string;
  timestamp?: string;
  authorName?: string;
  parts: Array<{ type: string; text?: string; language?: string; name?: string; mimeType?: string; url?: string }>;
}> {
  let chunk: unknown;

  try {
    chunk = JSON.parse(streamJson);
  } catch (error) {
    throw new Error(
      `Found React Router stream payload but its main JSON chunk could not be parsed: ${getErrorMessage(error)}`
    );
  }

  if (!Array.isArray(chunk)) {
    return [];
  }

  const linearConversationIndex = chunk.indexOf("linear_conversation");
  if (linearConversationIndex === -1 || !Array.isArray(chunk[linearConversationIndex + 1])) {
    return [];
  }

  const nodeIndexes = chunk[linearConversationIndex + 1] as unknown[];
  const messages: Array<{
    id: string;
    role: string;
    timestamp?: string;
    authorName?: string;
    parts: Array<{ type: string; text?: string; language?: string; name?: string; mimeType?: string; url?: string }>;
  }> = [];

  for (const nodeIndex of nodeIndexes) {
    if (typeof nodeIndex !== "number") {
      continue;
    }

    const node = asRecord(resolveReactRouterReference(chunk, nodeIndex));
    const message = asRecord(node.message);
    const author = asRecord(message.author);
    const role = author.role;

    if (typeof role !== "string" || !["user", "assistant", "system", "tool"].includes(role)) {
      continue;
    }

    const content = asRecord(message.content);
    const contentType = content.content_type;
    const rawParts = Array.isArray(content.parts) ? content.parts : [];
    const parts = normalizeReactRouterContentParts(contentType, rawParts);

    messages.push({
      id:
        typeof message.id === "string"
          ? message.id
          : typeof node.id === "string"
            ? node.id
            : `message-${nodeIndex}`,
      role,
      timestamp: normalizeMessageTimestamp(message.create_time ?? message.update_time),
      authorName: typeof author.name === "string" ? author.name : undefined,
      parts
    });
  }

  return messages.filter((message) => message.parts.length > 0);
}

function normalizeMessageTimestamp(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value > 1e12 ? value : value * 1000;
    return new Date(milliseconds).toISOString();
  }

  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return undefined;
}

function normalizeReactRouterContentParts(
  contentType: unknown,
  rawParts: unknown[]
): Array<{ type: string; text?: string; language?: string; name?: string; mimeType?: string; url?: string }> {
  if (contentType === "text") {
    return rawParts
      .filter((part): part is string => typeof part === "string")
      .filter((text) => text.trim().length > 0)
      .map((text) => ({
        type: "text",
        text
      }));
  }

  return [
    {
      type: typeof contentType === "string" ? contentType : "unknown"
    }
  ];
}

function resolveReactRouterReference(chunk: unknown[], reference: unknown): unknown {
  return resolveReactRouterValue(chunk, reference, new Map());
}

function resolveReactRouterValue(
  chunk: unknown[],
  value: unknown,
  memo: Map<number, unknown>
): unknown {
  if (typeof value === "number") {
    if (value === -5) {
      return null;
    }

    if (value >= 0 && value < chunk.length) {
      if (memo.has(value)) {
        return memo.get(value);
      }

      memo.set(value, null);
      const target = chunk[value];
      const resolved = resolveReactRouterValue(chunk, target, memo);
      memo.set(value, resolved);
      return resolved;
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveReactRouterValue(chunk, item, memo));
  }

  if (value !== null && typeof value === "object") {
    const output: Record<string, unknown> = {};

    for (const [rawKey, rawValue] of Object.entries(value)) {
      const key = decodeReactRouterObjectKey(chunk, rawKey);
      output[key] = resolveReactRouterValue(chunk, rawValue, memo);
    }

    return output;
  }

  return value;
}

function decodeReactRouterObjectKey(chunk: unknown[], rawKey: string): string {
  if (rawKey.startsWith("_")) {
    const keyIndex = Number(rawKey.slice(1));
    if (Number.isInteger(keyIndex) && keyIndex >= 0 && keyIndex < chunk.length) {
      const resolvedKey = chunk[keyIndex];
      if (typeof resolvedKey === "string") {
        return resolvedKey;
      }
    }
  }

  return rawKey;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readQuotedJavaScriptString(
  source: string,
  openingQuoteIndex: number
): { value: string; nextIndex: number } | null {
  let escaped = false;

  for (let index = openingQuoteIndex + 1; index < source.length; index += 1) {
    const char = source[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      const rawValue = source.slice(openingQuoteIndex + 1, index);
      return {
        value: decodeJavaScriptStringLiteral(rawValue),
        nextIndex: index + 1
      };
    }
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
