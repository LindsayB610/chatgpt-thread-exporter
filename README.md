# chatgpt-thread-exporter

`chatgpt-thread-exporter` is a small open source CLI that turns a ChatGPT shared-link conversation snapshot into readable Markdown.

The project is intentionally narrow. It is meant for short, valuable threads you want to keep as a durable Markdown artifact you control.

## Status

This project is past initial scaffolding and into implementation.

What is implemented today:

- CLI argument parsing and validation
- default stdout output routing
- safe local file output via `--out`
- local debug artifact output via `--debug-html` and `--debug-json`
- shared-link fetching with timeout and basic request hardening
- fixture capture and fixture-backed parser support
- extractor support for current streamed shared-link pages, including live text-message extraction
- transcript normalization for extracted conversation turns and saved fixture payloads
- polished Markdown rendering with deterministic golden tests
- pipeline staging for fetch, extract, normalize, render, and output routing
- build/test packaging for the local CLI

What is still ahead:

- GitHub write mode
- filtering and cleanup for more system/internal share-page artifacts in some live exports
- broader live-shape compatibility hardening over time

Phases 0 through 10 of the implementation plan are complete. The local-only exporter now works on real tested shared links, but live-share cleanup and GitHub export are still in progress.

## Design Principles

- local-first by default
- free to run in the normal case
- no required paid API usage
- no required hosted backend
- explicit writes only
- best-effort export, not a guaranteed forever-stable integration

## Why This Exists

For short threads, a ChatGPT shared link is the most practical export source because it captures the conversation as shared by the user.

This tool is meant to make that snapshot portable and readable without forcing a larger knowledge-management system around it.

## Quick Start

If you have never used a CLI before, these are the main commands to copy and paste.

First, open Terminal and go to the project folder:

```bash
cd "/Users/lindsaybrunner/Documents/chatgpt thread exporter"
```

Install dependencies once:

```bash
npm install
```

Save a shared conversation to a uniquely named Markdown file in Downloads:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d5d1d7-dbec-83e8-abf0-628476797aa9"
```

Print a shared conversation as Markdown in Terminal instead:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d5d1d7-dbec-83e8-abf0-628476797aa9" --stdout
```

Save a shared conversation to a specific Markdown file:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d5d1d7-dbec-83e8-abf0-628476797aa9" --out "/Users/lindsaybrunner/Downloads/reading-thread.md"
```

Overwrite an existing Markdown file:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d5d1d7-dbec-83e8-abf0-628476797aa9" --out "/Users/lindsaybrunner/Downloads/reading-thread.md" --force
```

Save debug artifacts if a thread exports strangely:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d5d1d7-dbec-83e8-abf0-628476797aa9" --out "/Users/lindsaybrunner/Downloads/reading-thread.md" --debug-html "/Users/lindsaybrunner/Downloads/reading-thread-debug.html" --debug-json "/Users/lindsaybrunner/Downloads/reading-thread-debug.json"
```

## Planned CLI Shape

```bash
chatgpt-thread-exporter \
  --url "https://chatgpt.com/share/..."
```

```bash
chatgpt-thread-exporter \
  --url "https://chatgpt.com/share/..." \
  --out "./conversation-exports/2026-04-07-brainstorm-on-garden-beds.md"
```

```bash
chatgpt-thread-exporter \
  --url "https://chatgpt.com/share/..." \
  --repo "LindsayB610/chat-exports" \
  --repo-path "conversation-exports/2026-04-07-brainstorm-on-garden-beds.md"
```

## Default Behavior

By default, the tool saves a Markdown file in your `Downloads` folder using the thread title plus `-export.md`.

If that filename already exists, it automatically picks a unique name like `thread-title-export-2.md`.

Other output modes:

- `--stdout` prints Markdown in Terminal instead of saving a default file
- `--out` writes to a specific local file path
- `--repo` plus `--repo-path` is reserved for future GitHub export support

## Privacy Notes

- This tool is for shared links you explicitly provide.
- Local output to `Downloads` is the default.
- GitHub export is optional and uses your own GitHub credentials.
- You should think carefully before exporting sensitive conversations anywhere permanent.

## Limitations

- The exporter depends on the current ChatGPT shared-link page shape.
- It is designed first for mostly text-based threads.
- Rich content may be represented as placeholders rather than perfectly preserved.
- Some live exports may still include internal/system artifacts that should be filtered more cleanly.
- This is not intended to be a lossless archival platform.

## Open Source

This project is intended to be public and permissively licensed.

It is currently released under the MIT License. See [LICENSE](./LICENSE).

## Planning

The current implementation plan lives in [CONVERSATION_EXPORT_PLAN.md](./CONVERSATION_EXPORT_PLAN.md).
