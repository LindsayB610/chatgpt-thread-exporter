# PDF Export Mini-Spec

## Goal

Add a prettier export mode that produces a PDF resembling the ChatGPT conversation UI while preserving the same underlying conversation data already used for Markdown export.

This is a presentation layer feature, not a separate parser or transcript model.

## Release Scope

Target release:

- `v1.2`

This work should not break or replace the existing Markdown export path.

## Product Requirements

- Markdown remains the default export format.
- PDF export is opt-in.
- PDF output should feel visually closer to the ChatGPT conversation experience than plain Markdown.
- PDF export should remain local-first and free to run.
- Default file naming should match the existing local export behavior:
  - save to `Downloads`
  - use title-based filenames
  - add numeric suffixes when needed

## Planned CLI Contract

Planned flag:

```bash
--format markdown
--format pdf
```

Rules:

- default format is `markdown`
- `--format pdf` changes the output file extension to `.pdf`
- `--stdout` remains Markdown-only in the first PDF release unless a later need arises
- `--out` may explicitly point to a `.pdf` path when `--format pdf` is selected

## Rendering Architecture

Pipeline shape:

1. shared link fetch
2. extract transcript data
3. normalize to the internal transcript model
4. render to ChatGPT-style HTML
5. hand HTML to a PDF engine
6. write resulting PDF bytes to disk

Important rule:

- generate PDF from a dedicated HTML render layer
- do not try to directly prettify raw Markdown into a PDF

## Visual Direction

The ChatGPT-like PDF should borrow these cues from the product UI:

- wide white page with strong left/right breathing room
- user prompts in soft rounded right-aligned bubbles
- assistant responses as open content blocks without bubble chrome
- restrained dividers between major assistant sections
- large, clean typography with generous line height
- code blocks in darker inset panels
- subtle metadata at the top of the export

Important design constraint:

- the PDF should be ChatGPT-inspired, not a literal pixel clone
- screen styling can preserve more of the roomy product feel
- print styling should compress whitespace where that improves page economy without hurting readability

## First-Pass HTML Renderer Requirements

The first-pass HTML renderer should:

- output a complete HTML document
- include embedded CSS so it is portable
- render user turns as right-aligned bubbles
- render assistant turns as readable rich text blocks
- support text, code, quote, list, unknown, and attachment metadata
- include print CSS with sensible page margins and page-break handling
- use semantic wrappers and stable class names so tests can target them

## Print-Friendliness Rules

The PDF output should optimize for real printing, not just on-screen resemblance.

That means:

- reduce excess vertical whitespace compared with the live ChatGPT UI
- tighten spacing between short turns
- compact bullet and numbered lists
- reduce heading margins where possible
- keep code blocks readable but avoid oversized padding
- prevent awkward page breaks inside turns, code blocks, and callout blocks
- keep the document readable in grayscale, not only in full color

Compression guidance:

- preserve clear distinction between user and assistant turns
- preserve generous readability for long assistant prose
- compress decorative whitespace before compressing content-bearing structure
- favor denser print output over a perfectly app-like screen clone

## PDF Engine Decision

Planned first implementation:

- use a headless browser PDF engine driven from Node
- prefer a mainstream open source choice with good print CSS support
- likely candidate: Playwright

Decision note:

- do not add the browser dependency until the HTML renderer is in place and tested

## Testing Plan

Before full PDF generation lands:

- add unit tests for the ChatGPT-style HTML renderer
- snapshot or golden-test representative HTML output
- verify user/assistant layout markers, code blocks, metadata, and attachment rendering

When full PDF generation lands:

- add a smoke test that produces a PDF file from a fixture transcript
- validate that Markdown export still works unchanged

## First Scaffold Deliverables

This scaffold phase should include:

- this mini-spec
- a dedicated ChatGPT-style HTML renderer module
- embedded theme CSS
- renderer tests proving the HTML shape is stable

This scaffold phase should not yet claim:

- finished CLI `--format pdf` support
- finished browser-driven PDF generation
- release-ready PDF output
