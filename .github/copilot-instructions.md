# GitHub Copilot Instructions

This repository is **portfolio-tools** — a TypeScript CLI that converts broker export
files (Comdirect, DKB, DeGiro, Coinbase) into [Portfolio Performance](https://help.portfolio-performance.info/en/) import CSVs.

**Before making any changes, read `AGENTS.md`** — it contains the full architecture
overview, plugin contract, and step-by-step guide for adding new sources.

## Quick orientation

- `src/core/source.ts` — `Source<T>` plugin interface (the key abstraction)
- `src/core/registry.ts` — register new sources here
- `src/sources/<id>/` — one folder per broker/document type
- `src/pp/types.ts` — Portfolio Performance output row types
- `src/cli.ts` — thin CLI dispatcher (`list` / `convert` / `help`)

## Key rules

- Plugins return `null` (unrecognised file) or throw (parse error) — never `process.exit`.
- Use `.js` extensions on all relative imports (NodeNext module resolution).
- Spread optional properties: `...(val !== undefined && { key: val })`.
- Only sanitised fixtures in `test/sources/*/examples/` — no real financial data.
