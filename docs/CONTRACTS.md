# Contracts

This document captures implementation contracts that should stay stable even while the extractor and renderer evolve.

## Compatibility Policy

Support for ChatGPT shared-link page shapes is intentionally conservative.

- A shared-link shape is supported only when it is covered by committed fixtures or an explicitly documented live-smoke result.
- Fixture-backed compatibility is the primary support contract.
- Live-link checks are confirmation, not the source of truth for long-term support claims.
- New shapes should not broaden support claims until they have regression coverage.

## Debug Artifact Contract

The CLI supports two local debug artifacts:

- `--debug-html`: the fetched raw shared-link HTML
- `--debug-json`: structured fetch and extract metadata

`--debug-json` should serialize this shape:

```ts
type DebugArtifactPayload = {
  fetch: {
    sourceUrl: string;
    finalUrl: string;
    status: number;
  };
  extract:
    | {
        status: "success";
        result: {
          payload: unknown;
          metadata?: Record<string, unknown>;
        };
      }
    | {
        status: "error";
        stage: "extract" | "normalize" | "render";
        error: {
          name: string;
          message: string;
        };
      };
};
```

## Debug Write Semantics

Debug artifact writes are best-effort local side effects.

- They are allowed during `--dry-run`.
- They may be written even if a later transcript destination write fails.
- They should still be written when extract, normalize, or render fails after a successful fetch, so repair work has the raw HTML and a stage-specific structured error.
- They should not overwrite a valid success debug artifact just because a later output destination write fails.
- They are not treated as part of an atomic all-or-nothing export transaction.

This behavior is intentional because debug artifacts are primarily for repair and diagnosis.
