# chatgpt-thread-exporter

`chatgpt-thread-exporter` is a local-first CLI that exports a ChatGPT shared link to a readable Markdown file.

It is meant for short, valuable conversations you want to keep as a durable file you control.

## Quick Start

If you have never used a CLI before, start here.

Open Terminal and go to the project folder:

```bash
cd "/Users/lindsaybrunner/Documents/chatgpt thread exporter"
```

Install dependencies once:

```bash
npm install
```

Export a shared conversation:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d5d1d7-dbec-83e8-abf0-628476797aa9"
```

That saves a Markdown file into your `Downloads` folder automatically.

## How It Saves Files

By default, the tool saves to your `Downloads` folder.

The filename is based on the thread title and ends with `-export.md`.

Examples:

- `first-grade-reading-sentences-export.md`
- `golden-raisin-turkey-tacos-export.md`

If that filename already exists, the tool automatically picks a unique name like:

- `first-grade-reading-sentences-export-2.md`
- `first-grade-reading-sentences-export-3.md`

## Common Commands

Print Markdown in Terminal instead of saving a file:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d5d1d7-dbec-83e8-abf0-628476797aa9" --stdout
```

Save to a specific file path:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d5d1d7-dbec-83e8-abf0-628476797aa9" --out "/Users/lindsaybrunner/Downloads/reading-thread.md"
```

Overwrite a specific file you already chose:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d5d1d7-dbec-83e8-abf0-628476797aa9" --out "/Users/lindsaybrunner/Downloads/reading-thread.md" --force
```

Show built-in help:

```bash
npm run dev -- --help
```

## Troubleshooting Only

You do not need this for normal use.

Only use debug files if a thread exports strangely and you want to inspect what the tool fetched and parsed:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d5d1d7-dbec-83e8-abf0-628476797aa9" --out "/Users/lindsaybrunner/Downloads/reading-thread.md" --debug-html "/Users/lindsaybrunner/Downloads/reading-thread-debug.html" --debug-json "/Users/lindsaybrunner/Downloads/reading-thread-debug.json"
```

## What It Does Today

- fetches public ChatGPT shared links
- extracts live conversation text from current shared-link pages
- renders readable Markdown with user and assistant turns
- saves locally by default
- creates unique filenames automatically
- supports explicit output paths with `--out`
- supports Terminal output with `--stdout`

## Current Limits

- it depends on the current ChatGPT shared-link page shape
- it is designed first for mostly text-based threads
- rich content may still be represented as placeholders
- some live exports may still include internal or system artifacts that need more cleanup
- GitHub export is not implemented yet

## Privacy

- this tool only works on shared links you explicitly provide
- local export is the default
- no paid API or hosted backend is required for normal use
- think carefully before exporting sensitive conversations anywhere permanent

## Open Source

This project is public and released under the MIT License. See [LICENSE](./LICENSE).

## Project Notes

- GitHub export is planned for a later release
- ChatGPT-style PDF export is planned for a later release
- the implementation plan lives in [CONVERSATION_EXPORT_PLAN.md](./CONVERSATION_EXPORT_PLAN.md)
