# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Pluggable source architecture** — every broker/document type is now a `Source<T>` plugin
  (`src/sources/<id>/`) conforming to a unified interface: `id`, `broker`, `inputKind`,
  `defaultPattern`, `outputs`, `parseFile`, `toRows`, `summarize`.
- **`src/core/`** — `Source` interface (`source.ts`), `OutputFormat` / `Diagnostic` types
  (`types.ts`), file-glob helpers (`fs.ts`), generic pipeline runner (`runner.ts`), static
  registry (`registry.ts`).
- **`src/pp/`** — canonical location for Portfolio Performance output types and CSV generators
  (moved from `src/portfolio_performance/`).
- **New CLI surface**:
  - `portfolio-tools list` — prints a table of all registered sources.
  - `portfolio-tools convert <source-id> <path> [--pattern] [--locale] [--output]`
  - `portfolio-tools help [<source-id>]`
  - Backward-compat shim: old `<broker> <tool>` shape still works (prints deprecation notice).
- **`comdirect-dividends` source** — parses comdirect "Ertragsgutschrift" dividend/distribution
  PDFs into Account Transactions CSV rows with `type: Dividend`.
- **`src/sources/` layout** — all five existing sources migrated:
  `comdirect-securities-account`, `dkb-portfolio-transactions`, `degiro-transactions`,
  `degiro-account`, `coinbase-transactions`.
- **ESLint flat config + Prettier** — `eslint.config.js`, `.prettierrc.json`, `.editorconfig`.
- **`package.json` metadata** — `author`, `license`, `repository`, `keywords`, `files`,
  `engines`, `publishConfig`; new scripts: `typecheck`, `lint`, `lint:fix`, `format`,
  `format:check`, `prepublishOnly`.
- **`LICENSE`** (MIT).
- **`.gitignore`** — covers `dist/`, `node_modules/`, PII documents, OS/editor files.
- **GitHub files** — CI workflow (Node 20+22 matrix + Bun smoke), issue templates (bug,
  new-source), PR template, `dependabot.yml`.
- **`AGENTS.md`** — coding-agent guide with architecture overview and "how to add a source"
  recipe.
- **`.github/copilot-instructions.md`** — Copilot Chat instructions.
- **`.vscode/`** — `settings.json`, `extensions.json`, `launch.json`.
- **Tests reorganised** into `test/sources/<source-id>/` mirroring `src/sources/`.

### Changed
- CLI output format identifiers changed: `csv` → `pp-portfolio-tx`, `account-csv` → `pp-account-tx`
  (legacy aliases still accepted in the compat shim).
- `src/portfolio_performance/` is excluded from `tsc` compilation (superseded by `src/pp/`).

[Unreleased]: https://github.com/vladimirdoroch/portfolio-tools/compare/HEAD...HEAD
