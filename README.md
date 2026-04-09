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
npm run dev -- --url "https://chatgpt.com/share/69d7d865-ae4c-83e8-ac85-06b3a111208d"
```

That saves a Markdown file into your `Downloads` folder automatically.

## How It Saves Files

By default, the tool saves to your `Downloads` folder.

The filename is based on the thread title and ends with `-export.md`.

Examples:

- `raccoon-city-design-export.md`
- `moon-explainer-export.md`

If that filename already exists, the tool automatically picks a unique name like:

- `raccoon-city-design-export-2.md`
- `raccoon-city-design-export-3.md`

## Common Commands

Print Markdown in Terminal instead of saving a file:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d7d865-ae4c-83e8-ac85-06b3a111208d" --stdout
```

Save to a specific file path:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d7d865-ae4c-83e8-ac85-06b3a111208d" --out "/Users/lindsaybrunner/Downloads/raccoon-city-design.md"
```

Overwrite a specific file you already chose:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d7d865-ae4c-83e8-ac85-06b3a111208d" --out "/Users/lindsaybrunner/Downloads/raccoon-city-design.md" --force
```

Show built-in help:

```bash
npm run dev -- --help
```

## GitHub Export

GitHub export is now supported when you explicitly opt into it.

You will need a `GITHUB_TOKEN` environment variable with access to the destination repository.

Example:

```bash
export GITHUB_TOKEN="your_token_here"
npm run dev -- --url "https://chatgpt.com/share/69d7d865-ae4c-83e8-ac85-06b3a111208d" --repo "LindsayB610/chatgpt-thread-exporter" --repo-path "exports/raccoon-city-design.md"
```

If the target file already exists, add `--force` to overwrite it.

On success, the CLI prints a confirmation like:

```text
Saved export to GitHub: owner/repo/path/to/file.md
```

## Troubleshooting Only

You do not need this for normal use.

Only use debug files if a thread exports strangely and you want to inspect what the tool fetched and parsed:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d7d865-ae4c-83e8-ac85-06b3a111208d" --out "/Users/lindsaybrunner/Downloads/raccoon-city-design.md" --debug-html "/Users/lindsaybrunner/Downloads/raccoon-city-design-debug.html" --debug-json "/Users/lindsaybrunner/Downloads/raccoon-city-design-debug.json"
```

## What It Does Today

- fetches public ChatGPT shared links
- extracts live conversation text from current shared-link pages
- renders readable Markdown with user and assistant turns
- saves locally by default
- creates unique filenames automatically
- supports explicit output paths with `--out`
- supports Terminal output with `--stdout`
- supports opt-in GitHub export with `--repo` and `--repo-path`

## Current Limits

- it depends on the current ChatGPT shared-link page shape
- it is designed first for mostly text-based threads
- rich content may still be represented as placeholders
- some live exports may still include internal or system artifacts that need more cleanup
- GitHub export requires your own `GITHUB_TOKEN`

## Privacy

- this tool only works on shared links you explicitly provide
- local export is the default
- no paid API or hosted backend is required for normal use
- think carefully before exporting sensitive conversations anywhere permanent

## Open Source

This project is public and released under the MIT License. See [LICENSE](./LICENSE).

## Project Notes

- ChatGPT-style PDF export is planned for a later release
- the implementation plan lives in [CONVERSATION_EXPORT_PLAN.md](./CONVERSATION_EXPORT_PLAN.md)
