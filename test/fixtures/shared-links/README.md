# Shared-Link Fixtures

Save sanitized shared-link HTML fixtures here for extractor and renderer tests.

Fixture rules:

- Keep all committed fixture content safe for a public OSS repo.
- Prefer fictionalized or heavily sanitized conversation text.
- Preserve parser-relevant DOM and payload shape even when the visible text is rewritten.
- Record sanitization notes in `manifest.json`.
- Add new fixtures when a live shared-link shape breaks parsing or introduces a new content shape.

Fixture categories:

- `live-derived`: sanitized from a real shared-link capture while preserving transport and payload structure.
- `synthetic`: invented fixture used to sketch future content scenarios once the transport shape is already known.

Initial fixture set:

- `live-stream-thread.fixture.html`
- `plain-text-thread.fixture.html`
- `code-block-thread.fixture.html`
- `rich-content-thread.fixture.html`
- `partial-thread.fixture.html`
- `malformed-missing-next-data.fixture.html`

Do not commit sensitive conversation data.
