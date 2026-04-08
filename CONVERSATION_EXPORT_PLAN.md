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
- parser failures are diagnosable when the shared-link page shape changes
- the implementation can be developed, run, and published without paid infrastructure owned by the maintainer

The v1 release candidate is successful if:

- the local-only exporter path is reliable end to end
- fixture-based extractor, normalizer, and renderer tests are stable
- one manual live-link smoke test succeeds before release

GitHub write mode is valuable, but it is not required for the first public OSS release candidate.

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
- `--dry-run` still renders Markdown and prints it to stdout unless a future `--quiet` flag is introduced.
- `--debug-html` writes fetched HTML to the requested local path whether or not `--dry-run` is set.
- `--debug-json` writes extracted structured debug data to the requested local path whether or not `--dry-run` is set.
- debug artifact writes are the only writes allowed during `--dry-run`.
- `--force` allows overwrite behavior for explicit destinations.
- Without `--force`, writing to an existing local file is an error.
- Without `--force`, GitHub writes must fail if the target path already exists and no explicit update behavior was requested.

### Behavior Matrix

- `--url` only: print Markdown to stdout
- `--url --stdout`: print Markdown to stdout
- `--url --out <path>`: write Markdown to local file only
- `--url --out <path> --stdout`: write local file and print Markdown to stdout
- `--url --dry-run`: print Markdown to stdout and perform no transcript-destination writes
- `--url --dry-run --out <path>`: print Markdown to stdout and do not write the transcript file
- `--url --dry-run --repo ... --repo-path ...`: print Markdown to stdout and do not call GitHub
- `--url --debug-html <path>`: write debug HTML artifact and also follow normal transcript output behavior
- `--url --debug-json <path>`: write debug JSON artifact and also follow normal transcript output behavior
- `--url --dry-run --debug-html <path> --debug-json <path>`: print Markdown to stdout and write both local debug artifacts only

### Path Validation

Local path rules for `--out`, `--debug-html`, and `--debug-json`:

- empty paths are invalid
- directory-only paths are invalid
- parent-directory traversal like `..` should be rejected in generated default paths and treated cautiously in explicit paths
- if explicit absolute paths are allowed, document that they are used exactly as provided
- path validation errors should fail before any network fetch

GitHub path rules for `--repo-path`:

- must be a non-empty repository-relative file path
- must not begin with `/`
- must not contain `..` traversal segments
- must not end with `/`
- must not target an empty filename
- normalization must be deterministic before API calls

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
- supported shared-link shapes are defined by committed fixtures and explicitly documented live-smoke compatibility notes

### Compatibility Policy

Compatibility is defined conservatively for v1:

- a shared-link shape is considered supported only if it is covered by committed fixtures or by an explicitly documented live-smoke result
- new page shapes should not silently broaden support claims until they have regression coverage
- fixture-backed compatibility is the primary support contract for the extractor
- live-link checks are confirmation, not the source of truth for long-term support claims

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
- v1 may collapse unmodeled rich structures into `unknown` blocks without treating that as a parser defect

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
- validate explicit paths before fetch

### 6. GitHub Writer

Responsibility:

- create or update a Markdown file in a user-selected repository

Rules:

- require explicit `--repo` and `--repo-path`
- if target file does not exist, create it
- if target file exists and `--force` is not set, fail with a clear message
- if target file exists and `--force` is set, update it using the current blob SHA
- treat SHA mismatch or conflict responses as failures with actionable guidance rather than silently retrying
- branch behavior must be explicit: write to the provided branch or the repo default branch, but do not auto-create branches in v1
- use an explicit commit message format

Suggested commit message:

- `Export ChatGPT thread: <title>`

GitHub mode contract:

- create-only by default
- overwrite only with `--force`
- fail clearly on missing auth, missing repo access, invalid repo path, and API conflicts

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

Path and title determinism should be tested together, not only as isolated unit behavior.

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
- include clear guidance when auth is missing or repo access is insufficient

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

### Recommended Development Style

Use a hybrid testing approach:

- use TDD for stable, deterministic logic
- use fixture-driven development for the extractor

TDD is a strong fit for:

- CLI argument parsing and validation
- title derivation
- slug generation
- overwrite rules
- Markdown renderer behavior
- normalized transcript behavior once fixture shapes are known

Fixture-driven development is the right fit for the extractor because the first pass depends on observing real shared-link HTML structure.

Recommended extractor workflow:

1. capture a real shared-link HTML fixture
2. sanitize it before commit
3. write a failing extractor test against that fixture
4. implement extraction logic to satisfy the test
5. keep the fixture as a regression guard

### Fixture Hygiene

Committed fixtures must be safe for a public OSS repo.

Rules:

- never commit sensitive or private conversation content
- redact names, emails, links, IDs, and other user-specific identifiers unless they are already intentionally public and necessary for the parser shape
- prefer sanitized real fixtures over synthetic fixtures when parser shape would otherwise be lost
- keep a private local fixture set outside the repo when a shape is useful but unsafe to publish
- document the sanitization approach used for each committed fixture
- fixture review should be part of normal code review before commit

### Fixture Tests

Capture a small set of representative shared-link HTML fixtures:

- short plain-text thread
- thread with code blocks
- thread with slightly richer content or metadata

Test expectations:

- extractor can locate payload in each fixture
- normalizer produces stable turn/block structure
- renderer snapshots are readable and deterministic

Fixture coverage should expand whenever a new shared-link shape or transcript block type is discovered.

Negative fixture coverage should include:

- missing payload
- malformed or truncated HTML
- unexpected payload shape
- unsupported block structures

### Unit Tests

Add focused tests for:

- CLI argument parsing
- title derivation
- slug generation
- destination validation
- path validation
- overwrite rules
- renderer formatting of mixed text and code

CLI-facing tests should also cover:

- exit codes
- stdout vs stderr separation
- user-facing error messages
- meaningful flag combinations

### Integration Tests

Add end-to-end tests that run:

- fixture HTML input
- extraction
- normalization
- rendering

Coverage goals:

- one plain-text conversation fixture
- one fixture with code blocks
- one fixture with unsupported or richer content that degrades gracefully
- one malformed fixture that produces a clear failure
- one partial fixture that still renders useful output with placeholders

These should verify the full pipeline produces stable Markdown from representative saved inputs.

### Writer Tests

Add tests for:

- local writer creates parent directories
- local writer refuses overwrite without `--force`
- local writer allows overwrite with `--force`
- debug artifact writes succeed during `--dry-run`
- GitHub writer create behavior
- GitHub writer SHA-based update behavior
- GitHub writer auth failure behavior
- GitHub writer conflict behavior
- GitHub writer branch selection behavior

GitHub writer tests should mock HTTP interactions rather than requiring live network access.

### Test Gates

Every PR should pass:

- unit tests
- fixture-based integration tests
- writer tests with mocked GitHub interactions
- CLI behavior tests for exit codes and stdout/stderr behavior

Manual before release:

- one live shared-link smoke test
- one manual check of debug artifact output

Release should be blocked by:

- fixture regressions
- renderer golden test diffs not intentionally approved
- broken CLI behavior for documented flag combinations

These gates are the operational definition of “good coverage” for this project.

### Smoke Test

One manual smoke-test command against a real shared link should remain part of the release checklist.

Testing and CI should stay on free-tier-friendly tooling and should not require paid external services.

Treat live-link validation as release smoke testing, not as the primary gate for day-to-day development.

## Development Phases

Break the implementation into small, discrete chunks that each leave the repo in a testable state.

### Phase 0: Repo Foundation

- create the public repo scaffold
- add `README.md`, `LICENSE`, and `.gitignore`
- add TypeScript and test tooling config
- create source and test directories

Done when:

- the repo clearly communicates scope, license, and project shape
- the scaffold can support incremental implementation

### Phase 1: CLI Contract

- implement argument parsing
- implement destination validation
- define stdout, `--out`, `--repo`, `--repo-path`, `--dry-run`, `--debug-html`, `--debug-json`, and `--force` semantics
- define path validation rules
- add TDD coverage for CLI validation behavior

Done when:

- invalid argument combinations fail clearly
- default stdout behavior is unambiguous
- the CLI contract is covered by tests

### Phase 2: Core Types and Contracts

- define extracted, normalized, and rendered transcript types
- define supported fixture-driven compatibility policy
- define debug artifact shapes

Done when:

- the project has a stable internal contract to build against
- fixture support boundaries are explicit

### Phase 3: Pipeline Skeleton

- wire the high-level pipeline stages together
- keep extractor and writer implementations stubbed if needed
- add pipeline wiring tests rather than true end-to-end smoke tests

Done when:

- the CLI path is coherent even if some stages are placeholders
- stage boundaries are testable independently

### Phase 4: Fetcher and Debug Output

- implement shared-link fetching
- capture final URL and response status
- implement `--debug-html`
- implement `--debug-json`
- add tests around fetcher error handling where practical

Done when:

- the CLI can fetch a real shared link
- raw HTML and extracted debug data can be saved locally for parser work

### Phase 5: Fixture Capture

- collect the first representative shared-link HTML fixtures
- sanitize them for public commit
- document fixture handling rules
- add failing extractor tests tied to those fixtures

Done when:

- the repo contains enough real fixtures to drive extractor work
- parser work can proceed without depending on live links every time

### Phase 6: Extractor V1

- implement payload discovery for the current shared-link shape
- return structured extraction metadata and clear failures
- satisfy the first fixture tests

Done when:

- extractor tests pass on the initial saved fixtures
- extractor works on at least one live shared link

### Phase 7: Normalizer V1

- convert extracted payloads into the transcript turn/block model
- preserve text and code as first-class blocks
- degrade unsupported content into explicit placeholders
- add tests for normalized output on saved fixtures

Done when:

- normalized output is stable for the first fixture set
- block boundaries survive into the renderer layer

### Phase 8: Renderer V1

- render normalized transcripts to Markdown
- preserve turn order and code fences
- add snapshot or golden tests for representative outputs
- verify whitespace and heading stability in golden tests

Done when:

- plain-text and code-heavy fixtures render into readable Markdown
- renderer output is deterministic under test

### Phase 9: Local File Writer

- implement `--out`
- create parent directories
- enforce overwrite rules and `--force`
- add writer tests for file creation and overwrite behavior

Done when:

- local export works safely for explicit file paths
- overwrite behavior is covered by tests

### Phase 10: Full Local Export Integration

- run end-to-end tests from fixture HTML through Markdown output
- tighten error messages
- ensure `--dry-run` and stdout behavior remain correct

Done when:

- the local-only exporter path is reliable and pleasant to use
- the tool delivers its core value without GitHub mode

This is the target first public OSS release candidate.

### Phase 11: GitHub Writer

- implement GitHub auth handling
- implement create and force-update behavior
- mock GitHub API interactions in tests
- surface clear commit results and failure messages

Done when:

- the CLI can write to an explicitly selected repo path
- GitHub behavior is tested without requiring paid infrastructure

This can ship as `v1.1` if it is not ready at the first public release.

### Phase 12: Final Polish

- improve formatting and metadata presentation
- tighten privacy and limitations docs
- add README usage examples
- run final manual smoke tests
- decide packaging and release posture for the public CLI

Done when:

- the project is ready for a first public OSS release
- the README matches actual behavior

### Packaging and Release Mechanics

If public distribution through npm is desired, decide this explicitly after the local-only release candidate is stable.

Questions to answer before npm publication:

- whether the package should be published to npm at all or remain GitHub-installable first
- which files are included in the published package
- whether the CLI should publish from built `dist/` output only
- versioning policy for parser-shape fixes vs behavior changes
- release checklist for fixture review, test gates, and smoke testing

Recommended posture:

- do not block the first public repo release on npm publication
- add npm publishing only after local install and release mechanics are proven comfortable

## Auth Strategy

### Shared Link

The exporter should not require OpenAI auth if the shared link is publicly accessible.

This is an assumption, not a guarantee. If shared-link access behavior changes, the fetch layer may need to evolve.

### GitHub

Use a fine-grained personal access token with:

- access only to the selected destination repo
- `Contents: Read and write`

Prefer environment-variable configuration for the token in CLI usage.

Suggested environment variable:

- `GITHUB_TOKEN`

GitHub auth is optional and only needed for GitHub write mode.

Auth behavior:

- fail clearly if GitHub mode is requested without a token
- fail clearly if the token lacks repo access
- do not prompt interactively in v1

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

Support policy:

- use one package manager consistently in the repo
- publish and test against an explicit minimum Node.js version
- keep the dependency surface small
- avoid dependencies that would require frequent emergency maintenance for a simple CLI

## Recommendation Summary

Build the first version as a small CLI in `LindsayB610/chatgpt-thread-exporter`.

Ship this shape first:

- shared-link URL in
- Markdown to stdout by default
- explicit local file write
- parser fixtures and renderer tests from the start

Optional next release:

- explicit GitHub write

The key v2 change is this:

- do not flatten turns too early
- do not postpone parser test fixtures
- do not leave write semantics ambiguous
