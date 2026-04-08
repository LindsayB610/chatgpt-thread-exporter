import type { ExportBlock, ExportTranscript } from "./types.js";

export function renderMarkdown(transcript: ExportTranscript): string {
  const lines: string[] = [
    `# ${transcript.title}`,
    "",
    `Source: ${transcript.sourceUrl}`,
    `Exported: ${transcript.exportedAt}`
  ];

  for (const turn of transcript.turns) {
    lines.push("", `## ${labelForRole(turn.role)}`, "");

    for (const block of turn.blocks) {
      lines.push(...renderBlock(block), "");
    }
  }

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return `${lines.join("\n")}\n`;
}

function labelForRole(role: ExportTranscript["turns"][number]["role"]): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function renderBlock(block: ExportBlock): string[] {
  switch (block.kind) {
    case "text":
    case "quote":
      return [block.text];
    case "list":
      return block.items.map((item) => `- ${item}`);
    case "code":
      return [`\`\`\`${block.language ?? ""}`, block.text, "```"];
    case "unknown":
      return [`[Unsupported content${block.rawType ? `: ${block.rawType}` : ""}] ${block.summary}`];
    default:
      return assertNever(block);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled block kind: ${JSON.stringify(value)}`);
}
