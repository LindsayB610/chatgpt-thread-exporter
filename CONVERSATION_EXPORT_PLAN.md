# ChatGPT Thread Exporter Plan V2

## Project

- Tool repo: `LindsayB610/chatgpt-thread-exporter`
- Product shape: small open source CLI
- Primary job: turn a ChatGPT shared-link conversation snapshot into readable Markdown

## Goal

Build a lightweight local-first exporter for short, intentional ChatGPT threads.

This implementation must be wholly free for you to operate:

- no required paid SaaS components
- no required paid API usage
- no hosted backend required for normal use
- no dependency on maintainer-operated infrastructure

Target user flow:

1. Finish a conversation in ChatGPT
2. Create a shared link for that conversation
3. Run one CLI command with the shared-link URL
4. Review Markdown on stdout or write it to an explicit destination

## Product Boundary

This remains a deliberately narrow POC.

In scope:

- export one shared-link snapshot at a time
- support short, mostly text-first conversations well
- preserve readable structure, especially code blocks
- write output to stdout by default
- optionally write to a local file
- optionally write to a user-selected GitHub repo path
- keep normal usage free and local-first

Out of scope:

- guaranteed stability against future ChatGPT page changes
- full-fidelity export for every rich content type
- automatic sync or background export
- indexing, tagging, search, embeddings, or notebook features
- bulk archival workflows

## Core Product Decisions

### Why Shared Links

For this use case, the shared-link snapshot is the most practical source of truth because it captures the conversation state as shared by the user.

This is preferable to trying to reconstruct the thread through a Custom GPT action, which is not a reliable raw transcript interface.

### Default Output Policy

Default behavior is:

- write rendered Markdown to stdout

Writes are always explicit:

- `--out <path>` writes to a local file
- `--repo <owner/name>` and `--repo-path <path>` write to GitHub

The CLI must never default to writing into its own source repo.

### Cost Constraint

The implementation must stay free to run in the normal case.

That means:

- no required hosted service operated by the maintainer
- no required database
- no paid queue, worker, or serverless platform
- no dependency on paid OCR, parsing, or AI APIs

Acceptable optional user-provided dependencies:

- GitHub, only when the user explicitly opts into writing to their own repo
- a GitHub personal access token, only for the optional GitHub write path

### Repo Strategy

The tool lives in:

- `LindsayB610/chatgpt-thread-exporter`

Exported conversation artifacts should live only in destinations explicitly chosen by the user, not in the tool repo by default.

### Open Source Posture

The tool should be public and released under an OSS license.

Recommended default:

- MIT License

Alternative acceptable choice:

- Apache-2.0

The first public release should include:

- `LICENSE`
- `README.md`
- clear privacy and limitation notes

## Success Criteria

The POC is successful if:

- one real shared link can be fetched reliably
- extracted turns can be normalized into a stable internal model
- Markdown output is readable and useful for short text-heavy threads
- code blocks remain readable
- stdout mode works without side effects
- local file mode works with explicit paths
- GitHub write mode works with explicit repo and path
- parser failures are diagnosable when the shared-link page shape changes
- the implementation can be developed, run, and published without paid infrastructure owned by the maintainer

The POC does not need to prove:

- long-term parser durability
- perfect fidelity for every block type
- support for every ChatGPT conversation variant

## CLI Contract

### Command

```bash
chatgpt-thread-exporter \
  --url "https://chatgpt.com/share/..." \
  --stdout
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

### Required Flag

- `--url`

### Optional Flags

- `--stdout`
- `--out <path>`
- `--repo <owner/name>`
- `--repo-path <path>`
- `--title <title>`
- `--branch <name>`
- `--dry-run`
- `--debug-html <path>`
- `--debug-json <path>`
- `--force`

### Flag Semantics

- With no destination flags, output goes to stdout.
- `--stdout` is allowed but redundant when no write destination is provided.
- `--out` writes to a local file and does not also print to stdout unless `--stdout` is set.
- `--repo` requires `--repo-path`.
- `--repo-path` without `--repo` is an error.
- `--dry-run` performs fetch, extract, normalize, and render, but performs no writes.
- `--dry-run` prints Markdown to stdout unless `--debug-json` or `--debug-html` is the only requested output worth keeping.
- `--force` allows overwrite behavior for explicit destinations.
- Without `--force`, writing to an existing local file is an error.
- Without `--force`, GitHub writes must fail if the target path already exists and no explicit update behavior was requested.

## Architecture

### 1. Fetcher

Responsibility:

- fetch shared-link HTML
- follow redirects
- capture final URL, status code, and response headers needed for debugging

Notes:

- use standard HTTP fetch
- keep the fetcher free of parsing logic
- avoid browser automation unless plain fetch is proven insufficient

### 2. Extractor

Responsibility:

- parse the shared-link page
- locate the serialized conversation payload
- return raw conversation-shaped data plus extraction metadata

Notes:

- this is the highest-risk module
- extraction logic must be isolated behind a small interface
- extractor errors should include structured failure reasons
- debug mode should make it easy to save HTML and extracted payloads for repair work

### 3. Normalizer

Responsibility:

- convert extracted data into a renderer-friendly internal model
- preserve block boundaries instead of flattening everything into one string

Minimum normalized model:

```ts
type ExportBlock =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string; language?: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "unknown"; rawType?: string; summary: string };

type ExportTurn = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  blocks: ExportBlock[];
  timestamp?: string;
  authorName?: string;
  metadata?: {
    attachments?: Array<{
      name?: string;
      mimeType?: string;
      url?: string;
    }>;
    source?: Record<string, unknown>;
  };
};

type ExportTranscript = {
  sourceUrl: string;
  finalUrl: string;
  exportedAt: string;
  title: string;
  turns: ExportTurn[];
};
```

Notes:

- text and code are first-class
- unsupported block types should degrade into explicit placeholders, not disappear silently
- `metadata.source` can preserve raw details needed for future repairs without affecting the rendered output

### 4. Renderer

Responsibility:

- render a stable, readable Markdown transcript from normalized data

Suggested output:

```md
# Brainstorm on garden beds

Source: https://chatgpt.com/share/...
Exported: 2026-04-07T10:15:00-07:00

## User

I want to figure out raised beds for the back yard.

## Assistant

Here are three layouts to consider:

```python
print("example")
```
```

Renderer rules:

- preserve turn order exactly
- keep code blocks fenced
- separate turns clearly
- include lightweight frontmatter only if it materially improves downstream use
- render unsupported content as labeled placeholders, not empty gaps

### 5. Local Writer

Responsibility:

- write Markdown to a user-selected local path

Rules:

- create parent directories when needed
- fail on existing file unless `--force` is set
- never infer a default local save path

### 6. GitHub Writer

Responsibility:

- create or update a Markdown file in a user-selected repository

Rules:

- require explicit `--repo` and `--repo-path`
- if target file does not exist, create it
- if target file exists and `--force` is not set, fail with a clear message
- if target file exists and `--force` is set, update it using the current blob SHA
- use an explicit commit message format

Suggested commit message:

- `Export ChatGPT thread: <title>`

## Naming and Title Strategy

### Title Resolution

Use this order:

1. explicit `--title`
2. title-like conversation metadata if present
3. first user message, trimmed aggressively
4. fallback `untitled-chat`

### Slug Rules

- lowercase
- ASCII slug by default
- replace whitespace with `-`
- strip punctuation unsafe for file paths
- collapse repeated separators
- trim to a reasonable length such as 60 characters

### Filename Pattern

Recommended pattern:

- `YYYY-MM-DD-<slug>.md`

If a path is not fully specified by the user in a future helper mode, the same shared link should map deterministically to the same base filename.

## Failure Modes

### 1. Shared-link page shape changes

Symptoms:

- extractor cannot find payload
- extractor finds payload but shape no longer matches expectations

Mitigations:

- isolate extractor behind a narrow interface
- maintain saved HTML fixtures for parser tests
- support `--debug-html`
- support `--debug-json`
- return actionable parser errors

### 2. Unsupported rich content

Symptoms:

- partial fidelity for images, canvases, files, or tool-specific blocks

Mitigations:

- preserve readable text first
- preserve code blocks where available
- render placeholders for unsupported blocks
- document the tool as text-first and best-effort

### 3. Duplicate exports

Mitigations:

- explicit local and GitHub overwrite behavior
- default to fail rather than silently replace
- allow overwrite only with `--force`

### 4. GitHub write failure

Mitigations:

- keep Markdown generation independent from write steps
- support `--dry-run`
- print Markdown to stdout on write failure when practical
- include GitHub API error details without leaking secrets

### 5. Privacy mistakes

Mitigations:

- default to stdout
- require explicit opt-in for GitHub
- document privacy tradeoffs clearly in the README

### 6. Cost creep

Symptoms:

- implementation starts depending on hosted services or paid APIs

Mitigations:

- keep the architecture CLI-first and local-first
- prefer native Node.js capabilities and small libraries
- reject features that require a maintained backend for v1
- treat browser automation as a last resort because it increases packaging and maintenance cost

## Testing Strategy

This needs to be part of v1, not postponed.

### Fixture Tests

Capture a small set of representative shared-link HTML fixtures:

- short plain-text thread
- thread with code blocks
- thread with slightly richer content or metadata

Test expectations:

- extractor can locate payload in each fixture
- normalizer produces stable turn/block structure
- renderer snapshots are readable and deterministic

### Unit Tests

Add focused tests for:

- title derivation
- slug generation
- destination validation
- overwrite rules
- renderer formatting of mixed text and code

### Smoke Test

One manual smoke-test command against a real shared link should remain part of the release checklist.

Testing and CI should stay on free-tier-friendly tooling and should not require paid external services.

## Build Order

### Phase 1: Scaffold and Contracts

- create CLI scaffold in `LindsayB610/chatgpt-thread-exporter`
- define TypeScript types for extracted and normalized data
- implement argument validation and destination rules
- add basic test harness

Success:

- CLI validates inputs correctly
- destination semantics are unambiguous

### Phase 2: Fetch and Debug Path

- fetch shared-link HTML
- implement `--debug-html`
- capture request metadata
- save first real fixtures for development

Success:

- CLI can fetch a real shared link reliably
- raw HTML can be saved for parser work

### Phase 3: Extractor

- implement payload discovery
- parse the current shared-link page shape
- add extractor fixture tests

Success:

- extractor works on saved fixtures and at least one live link

### Phase 4: Normalize and Render

- normalize extracted data into turn/block structure
- render Markdown to stdout
- snapshot test output

Success:

- short real conversations render into readable Markdown
- code blocks survive intact

### Phase 5: Local Write Path

- add `--out`
- create parent directories
- enforce overwrite rules

Success:

- CLI writes Markdown to an explicit local file path safely

### Phase 6: GitHub Write Path

- add GitHub auth and writer
- support create and force-update behavior
- surface clear commit results

Success:

- CLI can create or update a Markdown file in an explicitly selected repo path

### Phase 7: Polish

- improve formatting
- tighten error messages
- document privacy and limitations
- write README examples

## Auth Strategy

### Shared Link

The exporter should not require OpenAI auth if the shared link is publicly accessible.

This is an assumption, not a guarantee. If shared-link access behavior changes, the fetch layer may need to evolve.

### GitHub

Use a fine-grained personal access token with:

- access only to the selected destination repo
- `Contents: Read and write`

Prefer environment-variable configuration for the token in CLI usage.

GitHub auth is optional and only needed for GitHub write mode.

## README Commitments

The README should say plainly:

- this is a best-effort exporter for ChatGPT shared links
- the parser depends on the current shared-link page shape
- stdout is the default
- GitHub export is opt-in
- users should think carefully before exporting sensitive conversations
- unsupported content may be represented as placeholders
- normal local usage is free and requires no paid service operated by the maintainer
- GitHub export uses the user's own GitHub credentials when they opt in

## Tech Stack

- Node.js
- TypeScript
- native `fetch`
- a small HTML parsing utility only if needed
- a lightweight CLI parser
- GitHub REST API for contents operations

Tech selection rule:

- prefer free, well-supported open source dependencies with licenses compatible with a public OSS project

## Recommendation Summary

Build the first version as a small CLI in `LindsayB610/chatgpt-thread-exporter`.

Ship this shape first:

- shared-link URL in
- Markdown to stdout by default
- explicit local file write
- explicit GitHub write
- parser fixtures and renderer tests from the start

The key v2 change is this:

- do not flatten turns too early
- do not postpone parser test fixtures
- do not leave write semantics ambiguous
