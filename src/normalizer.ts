import type { CliOptions, ExportTranscript, ExtractResult, FetchResult } from "./types.js";
import { deriveTitle } from "./utils/title.js";

export function normalizeTranscript(
  fetchResult: FetchResult,
  extractResult: ExtractResult,
  options: CliOptions
): ExportTranscript {
  const payload = asRecord(extractResult.payload);
  const title = deriveTranscriptTitle(options.title, payload.title);

  return {
    sourceUrl: fetchResult.sourceUrl,
    finalUrl: fetchResult.finalUrl,
    exportedAt: new Date().toISOString(),
    title,
    turns: normalizeTurns(payload, extractResult)
  };
}

function normalizeTurns(
  payload: Record<string, unknown>,
  extractResult: ExtractResult
): ExportTranscript["turns"] {
  const messages = asMessageArray(payload.messages);
  if (messages.length > 0) {
    const turns = messages
      .map((message, index, allMessages) => normalizeMessageTurn(message, index, allMessages))
      .filter((turn): turn is NonNullable<typeof turn> => turn !== null);

    if (payload.isPartial === true) {
      turns.push({
        id: "system-partial-thread",
        role: "system",
        blocks: [
          {
            kind: "unknown",
            summary: "This shared conversation appears to be partial. Some earlier or later turns may be missing."
          }
        ],
        metadata: {
          source: {
            isPartial: true
          }
        }
      });
    }

    return turns;
  }

  return [
    {
      id: "system-extractor-placeholder",
      role: "system",
      blocks: [
        {
          kind: "unknown",
          rawType: String(payload.transport ?? "unknown"),
          summary:
            "Structured transcript turns are not available for this extracted payload yet."
        }
      ],
      metadata: {
        source: {
          extractResult
        }
      }
    }
  ];
}

function normalizeMessageTurn(
  message: MessageRecord,
  index: number,
  allMessages: MessageRecord[]
): ExportTranscript["turns"][number] | null {
  if (shouldDropArtifactMessage(message, index, allMessages)) {
    return null;
  }

  const attachments: Array<{ name?: string; mimeType?: string; url?: string }> = [];
  const blocks = message.parts.flatMap((part) => normalizePart(part, attachments));

  if (blocks.length === 0 && attachments.length === 0) {
    return null;
  }

  return {
    id: message.id,
    role: normalizeRole(message.role),
    blocks: blocks.length > 0 ? blocks : [{ kind: "unknown", summary: "Message had no supported parts." }],
    metadata: attachments.length > 0 ? { attachments } : undefined
  };
}

function normalizePart(
  part: PartRecord,
  attachments: Array<{ name?: string; mimeType?: string; url?: string }>
): ExportTranscript["turns"][number]["blocks"] {
  switch (part.type) {
    case "text":
      return asTextBlocks(part.text);
    case "code":
      if (typeof part.text !== "string" || part.text.trim().length === 0) {
        return [];
      }

      return [
        {
          kind: "code",
          text: part.text,
          language: typeof part.language === "string" ? part.language : undefined
        }
      ];
    default:
      if (isInternalOnlyPartType(part.type) && !part.name && !part.mimeType && !part.url) {
        return [];
      }

      attachments.push({
        name: part.name,
        mimeType: part.mimeType,
        url: part.url
      });
      return [
        {
          kind: "unknown",
          rawType: part.type,
          summary: part.name
            ? `Unsupported content preserved as metadata: ${part.name}`
            : "Unsupported content preserved as metadata."
        }
      ];
  }
}

function asTextBlocks(value: unknown): ExportTranscript["turns"][number]["blocks"] {
  if (typeof value !== "string") {
    return [{ kind: "unknown", summary: "Text part was present but unreadable." }];
  }

  const trimmed = value.trim();
  if (!trimmed || isKnownArtifactText(trimmed)) {
    return [];
  }

  return [
    {
      kind: "text",
      text: trimmed
    }
  ];
}

function normalizeRole(value: unknown): ExportTranscript["turns"][number]["role"] {
  switch (value) {
    case "user":
    case "assistant":
    case "system":
    case "tool":
      return value;
    default:
      return "system";
  }
}

function deriveTranscriptTitle(explicitTitle: string | undefined, extractedTitle: unknown): string {
  if (typeof extractedTitle === "string" && extractedTitle.trim().length > 0 && !explicitTitle?.trim()) {
    return extractedTitle.trim();
  }

  return deriveTitle(explicitTitle);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

type MessageRecord = {
  id: string;
  role: unknown;
  parts: PartRecord[];
};

type PartRecord = {
  type: string;
  text?: unknown;
  language?: string;
  name?: string;
  mimeType?: string;
  url?: string;
};

function asMessageArray(value: unknown): MessageRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => {
      const record = asRecord(entry);
      const rawParts = Array.isArray(record.parts) ? record.parts : [];

      return {
        id: typeof record.id === "string" ? record.id : `message-${index + 1}`,
        role: record.role,
        parts: rawParts.map((part) => {
          const partRecord = asRecord(part);

          return {
            type: typeof partRecord.type === "string" ? partRecord.type : "unknown",
            text: partRecord.text,
            language: typeof partRecord.language === "string" ? partRecord.language : undefined,
            name: typeof partRecord.name === "string" ? partRecord.name : undefined,
            mimeType: typeof partRecord.mimeType === "string" ? partRecord.mimeType : undefined,
            url: typeof partRecord.url === "string" ? partRecord.url : undefined
          };
        })
      };
    })
    .filter((message) => message.parts.length > 0 || typeof message.role === "string");
}

function isKnownArtifactText(text: string): boolean {
  return (
    text === "Original custom instructions no longer available" ||
    text === "The output of this plugin was redacted."
  );
}

function isInternalOnlyPartType(type: string): boolean {
  return type === "model_editable_context" || type === "thoughts" || type === "reasoning_recap";
}

function shouldDropArtifactMessage(
  message: MessageRecord,
  index: number,
  allMessages: MessageRecord[]
): boolean {
  return (
    isSinglePartArtifactMessage(message) || isTransientAssistantStatusMessage(message, index, allMessages)
  );
}

function isSinglePartArtifactMessage(message: MessageRecord): boolean {
  return (
    message.parts.length === 1 &&
    ((message.parts[0]?.type === "text" &&
      typeof message.parts[0].text === "string" &&
      isKnownArtifactText(message.parts[0].text.trim())) ||
      (message.parts[0]?.type === "code" &&
        (typeof message.parts[0].text !== "string" || message.parts[0].text.trim().length === 0)) ||
      (isInternalOnlyPartType(message.parts[0]?.type) &&
        !message.parts[0].name &&
        !message.parts[0].mimeType &&
        !message.parts[0].url))
  );
}

function isTransientAssistantStatusMessage(
  message: MessageRecord,
  index: number,
  allMessages: MessageRecord[]
): boolean {
  if (message.role !== "assistant" || message.parts.length !== 1 || message.parts[0]?.type !== "text") {
    return false;
  }

  const text = typeof message.parts[0].text === "string" ? message.parts[0].text.trim() : "";
  if (text.length === 0 || text.length > 280) {
    return false;
  }

  if (!/^(I('|’)m|I am)\b/.test(text)) {
    return false;
  }

  const nearbyMessages = allMessages.slice(index + 1, index + 3);
  return nearbyMessages.some((nextMessage) => isSinglePartArtifactMessage(nextMessage));
}
