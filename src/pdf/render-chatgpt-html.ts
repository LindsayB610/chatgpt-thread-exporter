import type { AttachmentReference, ExportBlock, ExportTranscript, ExportTurn } from "../types.js";

export function renderChatGptHtml(transcript: ExportTranscript): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${escapeHtml(transcript.title)}</title>`,
    "  <style>",
    indentLines(chatGptPdfCss(), 4),
    "  </style>",
    "</head>",
    "<body>",
    '  <main class="export-shell">',
    '    <header class="export-header">',
    `      <p class="export-brand">ChatGPT Export</p>`,
    `      <h1 class="export-title">${escapeHtml(transcript.title)}</h1>`,
    `      <p class="export-meta"><span>Source:</span> <span>${escapeHtml(transcript.sourceUrl)}</span></p>`,
    `      <p class="export-meta"><span>Exported:</span> <span>${escapeHtml(transcript.exportedAt)}</span></p>`,
    "    </header>",
    '    <section class="conversation-thread">',
    transcript.turns.map((turn) => indentLines(renderTurn(turn), 6)).join("\n"),
    "    </section>",
    "  </main>",
    "</body>",
    "</html>",
    ""
  ].join("\n");
}

function renderTurn(turn: ExportTurn): string {
  const classes = ["turn", `turn-${turn.role}`];
  const isBubble = turn.role === "user";

  return [
    `<article class="${classes.join(" ")}">`,
    `  <div class="${isBubble ? "turn-bubble" : "turn-content"}">`,
    `    <p class="turn-label">${escapeHtml(labelForRole(turn.role))}</p>`,
    turn.blocks.map((block) => indentLines(renderBlock(block), 4)).join("\n"),
    indentLines(renderAttachments(turn.metadata?.attachments), 4),
    "  </div>",
    "</article>"
  ]
    .filter(Boolean)
    .join("\n");
}

function renderBlock(block: ExportBlock): string {
  switch (block.kind) {
    case "text":
      return `<div class="block block-text">${renderTextParagraphs(block.text)}</div>`;
    case "code":
      return [
        '<section class="block block-code">',
        block.language ? `  <p class="code-language">${escapeHtml(block.language)}</p>` : "",
        `  <pre><code>${escapeHtml(block.text)}</code></pre>`,
        "</section>"
      ]
        .filter(Boolean)
        .join("\n");
    case "quote":
      return `<blockquote class="block block-quote">${renderTextParagraphs(block.text)}</blockquote>`;
    case "list":
      return [
        '<ul class="block block-list">',
        block.items.map((item) => `  <li>${escapeHtml(item)}</li>`).join("\n"),
        "</ul>"
      ].join("\n");
    case "unknown":
      return [
        '<section class="block block-unknown">',
        `  <p class="unknown-title">Unsupported content${block.rawType ? `: ${escapeHtml(block.rawType)}` : ""}</p>`,
        `  <p class="unknown-summary">${escapeHtml(block.summary)}</p>`,
        "</section>"
      ].join("\n");
    default:
      return assertNever(block);
  }
}

function renderAttachments(attachments?: AttachmentReference[]): string {
  const usableAttachments = (attachments ?? []).filter(
    (attachment) => attachment.name || attachment.mimeType || attachment.url
  );

  if (usableAttachments.length === 0) {
    return "";
  }

  return [
    '<section class="turn-attachments">',
    '  <p class="attachments-label">Attachments</p>',
    '  <ul class="attachments-list">',
    usableAttachments
      .map((attachment) => {
        const details = [attachment.name, attachment.mimeType, attachment.url]
          .filter(Boolean)
          .map((value) => escapeHtml(String(value)))
          .join(" · ");

        return `    <li>${details}</li>`;
      })
      .join("\n"),
    "  </ul>",
    "</section>"
  ].join("\n");
}

function renderTextParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

function labelForRole(role: ExportTurn["role"]): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function indentLines(value: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => (line.length > 0 ? `${prefix}${line}` : line))
    .join("\n");
}

function chatGptPdfCss(): string {
  return `
:root {
  --page-bg: #ffffff;
  --text: #202123;
  --muted: #6b7280;
  --border: #e5e7eb;
  --user-bubble: #f4f4f5;
  --assistant-surface: #ffffff;
  --code-bg: #1f2937;
  --code-text: #f9fafb;
  --note-bg: #fafaf9;
  --note-border: #d6d3d1;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: var(--page-bg);
  color: var(--text);
  font-family: "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif;
  line-height: 1.6;
}

body {
  padding: 32px 0 48px;
}

.export-shell {
  width: min(960px, calc(100vw - 64px));
  margin: 0 auto;
}

.export-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
}

.export-brand {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.export-title {
  margin: 0 0 12px;
  font-size: 40px;
  line-height: 1.1;
  font-weight: 700;
}

.export-meta {
  margin: 4px 0;
  color: var(--muted);
  font-size: 14px;
}

.conversation-thread {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.turn {
  display: flex;
}

.turn-user {
  justify-content: flex-end;
}

.turn-assistant,
.turn-system,
.turn-tool {
  justify-content: flex-start;
}

.turn-bubble,
.turn-content {
  max-width: 78%;
}

.turn-bubble {
  background: var(--user-bubble);
  border-radius: 24px;
  padding: 22px 24px;
}

.turn-content {
  padding: 0;
}

.turn-label {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.block {
  margin: 0 0 18px;
}

.block:last-child {
  margin-bottom: 0;
}

.block-text p,
.block-quote p {
  margin: 0 0 14px;
}

.block-text p:last-child,
.block-quote p:last-child {
  margin-bottom: 0;
}

.block-code {
  background: var(--code-bg);
  color: var(--code-text);
  border-radius: 18px;
  padding: 16px 18px;
  overflow: hidden;
}

.code-language {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.75;
}

.block-code pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.55;
}

.block-quote {
  margin: 0;
  padding: 0 0 0 18px;
  border-left: 3px solid var(--border);
  color: #374151;
}

.block-list {
  margin: 0;
  padding-left: 24px;
}

.block-unknown {
  padding: 16px 18px;
  border-radius: 16px;
  background: var(--note-bg);
  border: 1px solid var(--note-border);
}

.unknown-title {
  margin: 0 0 8px;
  font-weight: 700;
}

.unknown-summary {
  margin: 0;
  color: #44403c;
}

.turn-attachments {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.attachments-label {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.attachments-list {
  margin: 0;
  padding-left: 22px;
}

@page {
  margin: 18mm 16mm;
}

@media print {
  body {
    padding: 0;
  }

  .export-shell {
    width: 100%;
  }

  .turn,
  .block-code,
  .block-unknown {
    break-inside: avoid;
  }
}
`.trim();
}

function assertNever(value: never): never {
  throw new Error(`Unhandled PDF block kind: ${JSON.stringify(value)}`);
}
