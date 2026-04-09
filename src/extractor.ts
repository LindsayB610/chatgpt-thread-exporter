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
  const decodedStream = extractReactRouterDecodedStream(html);
  if (!decodedStream) {
    return null;
  }

  const sharedConversationId = requireMatch(
    decodedStream,
    /"sharedConversationId","([^"]+)"/u,
    "shared conversation id"
  );
  const shareRegion = narrowToShareRegion(decodedStream);
  const shareTail = narrowToShareTail(decodedStream);
  const title = requireLastMatch(shareRegion, /"title","([^"]+)"/gu, "stream title");

  return {
    payload: {
      transport: "react-router-stream",
      title,
      sharedConversationId,
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
      chunkCount: countReactRouterStreamChunks(html)
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

function extractReactRouterDecodedStream(html: string): string | null {
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

  if (decodedChunks.length === 0) {
    return null;
  }

  return decodedChunks.join("\n");
}

function countReactRouterStreamChunks(html: string): number {
  const needle = "window.__reactRouterContext.streamController.enqueue(";
  let count = 0;
  let searchIndex = 0;

  while (searchIndex < html.length) {
    const start = html.indexOf(needle, searchIndex);
    if (start === -1) {
      break;
    }

    count += 1;
    searchIndex = start + needle.length;
  }

  return count;
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
