import type { ExportBlock, ExportTranscript } from "./types.js";
import { formatConversationRange, formatExportedAt } from "./utils/date-display.js";

export function renderMarkdown(transcript: ExportTranscript): string {
  const conversationRange = formatConversationRange(transcript.turns.map((turn) => turn.timestamp));
  const lines: string[] = [
    `# ${transcript.title}`,
    "",
    `Source: ${transcript.sourceUrl}`,
    conversationRange
      ? `Conversation: ${conversationRange}`
      : `Exported: ${formatExportedAt(transcript.exportedAt)}`
  ];

  for (const turn of transcript.turns) {
    lines.push("", `## ${labelForRole(turn.role)}`, "");

    for (const block of turn.blocks) {
      lines.push(...renderBlock(block), "");
    }

    const attachmentLines = renderAttachments(turn.metadata?.attachments);
    if (attachmentLines.length > 0) {
      lines.push(...attachmentLines, "");
    }
  }

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return `${lines.join("\n")}\n`;
}

function labelForRole(role: ExportTranscript["turns"][number]["role"]): string {
  switch (role) {
    case "user":
      return "You";
    case "assistant":
      return "ChatGPT";
    case "system":
      return "System";
    case "tool":
      return "Tool";
    default:
      return role;
  }
}

function renderBlock(block: ExportBlock): string[] {
  switch (block.kind) {
    case "text":
      return [block.text];
    case "quote":
      return block.text.split("\n").map((line) => `> ${line}`);
    case "list":
      return block.items.map((item) => `- ${item}`);
    case "code":
      return [`\`\`\`${block.language ?? ""}`, block.text, "```"];
    case "image":
      return [`![${block.alt ?? "Generated image"}](${block.url})`];
    case "unknown":
      return [
        `> [!NOTE]`,
        `> Unsupported content${block.rawType ? `: ${block.rawType}` : ""}`,
        `> ${block.summary}`
      ];
    default:
      return assertNever(block);
  }
}

function renderAttachments(attachments?: ExportTranscript["turns"][number]["metadata"] extends infer Metadata
  ? Metadata extends { attachments?: infer A }
    ? A
    : never
  : never): string[] {
  const usableAttachments = (attachments ?? []).filter(
    (attachment) => attachment.name || attachment.mimeType || attachment.url
  );

  if (usableAttachments.length === 0) {
    return [];
  }

  const lines = ["Attachments:"];

  for (const attachment of usableAttachments) {
    const details = [attachment.name, attachment.mimeType, attachment.url]
      .filter(Boolean)
      .join(" | ");

    lines.push(`- ${details}`);
  }

  return lines;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled block kind: ${JSON.stringify(value)}`);
}
