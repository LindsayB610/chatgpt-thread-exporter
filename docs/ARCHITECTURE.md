# Architecture Notes

This directory is for implementation notes that are more tactical than the main plan.

Expected early documents:

- extractor assumptions about shared-link page structure
- fixture capture notes
- compatibility and debug artifact contracts
- GitHub writer behavior notes
- release checklist notes

Build notes:

- `tsconfig.json` is for editor/typecheck coverage across `src/` and `test/`
- `tsconfig.build.json` is for production CLI output from `src/` only

Pipeline notes:

- `buildPipelineArtifacts()` owns fetch -> extract -> normalize -> render
- `emitPipelineOutputs()` owns stdout/debug/local/GitHub routing
- `runCli()` is the thin top-level composition point
- stage dependencies are injectable for pipeline wiring tests
