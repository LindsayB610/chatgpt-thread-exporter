# chatgpt-thread-exporter

`chatgpt-thread-exporter` is a small open source CLI that turns a ChatGPT shared-link conversation snapshot into readable Markdown.

The project is intentionally narrow. It is meant for short, valuable threads you want to keep as a durable Markdown artifact you control.

## Status

This project is past initial scaffolding and into implementation.

What is implemented today:

- CLI argument parsing and validation
- default stdout output routing
- local debug artifact output via `--debug-html` and `--debug-json`
- shared-link fetching with timeout and basic request hardening
- pipeline staging for fetch, extract, normalize, render, and output routing
- build/test packaging for the local CLI

What is still ahead:

- real fixture capture from shared-link pages
- extractor implementation against committed fixtures
- transcript normalization beyond the current stub
- polished Markdown rendering for real threads
- GitHub write mode

Phases 0 through 4 of the implementation plan are complete. The next planned step is fixture capture and extractor work.

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

By default, the tool should render Markdown to stdout.

Writes are opt-in:

- `--out` for a local file
- `--repo` plus `--repo-path` for GitHub

The tool should never default to writing exported conversations into its own source repo.

## Privacy Notes

- This tool is for shared links you explicitly provide.
- Local or stdout output is the default.
- GitHub export is optional and uses your own GitHub credentials.
- You should think carefully before exporting sensitive conversations anywhere permanent.

## Limitations

- The exporter depends on the current ChatGPT shared-link page shape.
- It is designed first for short, mostly text-based threads.
- Rich content may be represented as placeholders rather than perfectly preserved.
- This is not intended to be a lossless archival platform.

## Open Source

This project is intended to be public and permissively licensed.

It is currently released under the MIT License. See [LICENSE](./LICENSE).

## Planning

The current implementation plan lives in [CONVERSATION_EXPORT_PLAN.md](./CONVERSATION_EXPORT_PLAN.md).
