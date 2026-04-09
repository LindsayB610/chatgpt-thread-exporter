# chatgpt-thread-exporter

`chatgpt-thread-exporter` is a local-first CLI that exports a ChatGPT shared link to a readable file you can keep.

It is meant for conversations you want to keep as a durable file you control, whether that means Markdown for reference or a print-friendly PDF.

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

Export a shared conversation as Markdown:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d82f78-1d20-83e8-bcbe-4bcf9675203b"
```

That saves a Markdown file into your `Downloads` folder automatically.

If you want a prettier, print-friendly PDF instead, install the browser dependency once:

```bash
npx playwright install chromium
```

Then export the same kind of shared conversation as a PDF:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d7d865-ae4c-83e8-ac85-06b3a111208d" --format pdf
```

That saves a PDF into your `Downloads` folder with the same unique title-based naming pattern.

## How It Saves Files

By default, the tool saves to your `Downloads` folder.

The filename is based on the thread title and ends with `-export.md`.

Examples:

- `raccoon-city-design-export.md`
- `artemis-program-explained-export.md`

If that filename already exists, the tool automatically picks a unique name like:

- `raccoon-city-design-export-2.md`
- `artemis-program-explained-export-2.md`

## Common Commands

Save a print-friendly PDF instead of Markdown:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d7d865-ae4c-83e8-ac85-06b3a111208d" --format pdf
```

Print Markdown in Terminal instead of saving a file:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d82f78-1d20-83e8-bcbe-4bcf9675203b" --stdout
```

Save to a specific file path:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d82f78-1d20-83e8-bcbe-4bcf9675203b" --out "/Users/lindsaybrunner/Downloads/artemis-program-explained.md"
```

Overwrite a specific file you already chose:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d82f78-1d20-83e8-bcbe-4bcf9675203b" --out "/Users/lindsaybrunner/Downloads/artemis-program-explained.md" --force
```

Save a PDF to a specific file path:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d7d865-ae4c-83e8-ac85-06b3a111208d" --format pdf --out "/Users/lindsaybrunner/Downloads/raccoon-city-design.pdf"
```

Show built-in help:

```bash
npm run dev -- --help
```

## Choosing Markdown vs PDF

Use Markdown when you want:

- a simple text file you can search, edit, or commit
- the lightest-weight export
- code-heavy threads in a plain, portable format

Use PDF when you want:

- something nicer to read or print
- layout that feels more like the original ChatGPT conversation
- image-heavy threads, where embedded images matter

For image-heavy threads, PDF is usually the better format. Markdown can include remote image links, but those signed image URLs may expire later.

## GitHub Export

GitHub export is now supported when you explicitly opt into it.

You will need a `GITHUB_TOKEN` environment variable with access to the destination repository.

The CLI writes to the exact repo path you provide with `--repo-path`.

Example:

```bash
export GITHUB_TOKEN="your_token_here"
npm run dev -- --url "https://chatgpt.com/share/69d7d865-ae4c-83e8-ac85-06b3a111208d" --repo "LindsayB610/chatgpt-thread-exporter" --repo-path "exports/raccoon-city-design.md"
```

If the target file already exists, add `--force` to overwrite it:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d7d865-ae4c-83e8-ac85-06b3a111208d" --repo "LindsayB610/chatgpt-thread-exporter" --repo-path "exports/raccoon-city-design.md" --force
```

If you want to write to a specific branch, add `--branch`:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d7d865-ae4c-83e8-ac85-06b3a111208d" --repo "LindsayB610/chatgpt-thread-exporter" --repo-path "exports/raccoon-city-design.md" --branch "main"
```

On success, the CLI prints a confirmation like:

```text
Saved export to GitHub: owner/repo/path/to/file.md
```

Important:

- the branch must already exist
- the CLI does not auto-create branches in `v1.1`
- GitHub export uses your own token and your own repository permissions

## Troubleshooting Only

You do not need this for normal use.

Only use debug files if a thread exports strangely and you want to inspect what the tool fetched and parsed:

```bash
npm run dev -- --url "https://chatgpt.com/share/69d82f78-1d20-83e8-bcbe-4bcf9675203b" --out "/Users/lindsaybrunner/Downloads/artemis-program-explained.md" --debug-html "/Users/lindsaybrunner/Downloads/artemis-program-explained-debug.html" --debug-json "/Users/lindsaybrunner/Downloads/artemis-program-explained-debug.json"
```

## What It Does Today

- fetches public ChatGPT shared links
- extracts live conversation text from current shared-link pages
- renders readable Markdown with user and assistant turns
- can also generate a ChatGPT-inspired, print-friendly PDF
- can embed generated images into PDFs when they are visibly rendered on the shared page
- saves locally by default
- creates unique filenames automatically
- supports explicit output paths with `--out`
- supports Terminal output with `--stdout`
- supports opt-in GitHub export with `--repo` and `--repo-path`

## Current Limits

- it depends on the current ChatGPT shared-link page shape
- some richer content still depends on what the shared page visibly renders
- Markdown image links for generated images may expire over time
- some live exports may still include internal or system artifacts that need more cleanup
- GitHub export requires your own `GITHUB_TOKEN`
- PDF export requires a local Playwright browser install

## Privacy

- this tool only works on shared links you explicitly provide
- local export is the default
- no paid API or hosted backend is required for normal use
- think carefully before exporting sensitive conversations anywhere permanent

## Open Source

This project is public and released under the MIT License. See [LICENSE](./LICENSE).

## Project Notes

- the implementation plan lives in [CONVERSATION_EXPORT_PLAN.md](./CONVERSATION_EXPORT_PLAN.md)
