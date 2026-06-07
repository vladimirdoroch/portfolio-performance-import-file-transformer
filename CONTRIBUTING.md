# Contributing to portfolio-tools

Thank you for your interest in contributing!

## Development setup

```bash
# 1. Clone and install
git clone https://github.com/vladimirdoroch/portfolio-tools.git
cd portfolio-tools
npm install

# 2. Run tests
npm test

# 3. Type-check
npm run typecheck

# 4. Lint + format
npm run lint
npm run format:check
```

**Run without a build step (Bun required):**

```bash
bun src/cli.ts list
bun src/cli.ts convert <source-id> <path>
```

## Adding a new source plugin

See `AGENTS.md → "How to add a new source"` for the step-by-step guide.

The short version:

1. Create `src/sources/<broker>-<tool>/` with:
   - `types.ts` — intermediate representation
   - `text-parser.ts` or `csv-parser.ts` — raw input → domain type
   - `transformer.ts` — domain type → `PortfolioTransactionRow[]` or `AccountTransactionRow[]`
   - `pdf-reader.ts` (PDF sources only) — calls `pdf-parse` then the text-parser
   - `index.ts` — default-exports a `Source<T>` and re-exports public API
2. Register the source in `src/core/registry.ts`.
3. Add tests in `test/sources/<source-id>/` with `fixtures.ts` and `*.test.ts` files.
4. Add the source to the table in `README.md`.

## Rules

- **Never commit real financial documents.** Only sanitised fixtures with all personal data replaced by placeholders belong in `test/sources/*/examples/`.
- **Plugins must not call `process.exit`.** Return `null` for unrecognised files; throw for parse errors. The runner handles exit codes.
- **Keep `exactOptionalPropertyTypes: true` in mind.** Use spread patterns (`...(value !== undefined && { key: value })`) instead of always-present optional properties.
- Run `npm run typecheck && npm test` before opening a pull request.

## Project layout

```
src/
  core/           Plugin contracts (Source, registry, runner, fs helpers)
  pp/             Portfolio Performance output types and CSV generators
  sources/        One folder per source plugin
    <source-id>/
      index.ts    Default export: Source<T> + public API re-exports
      source.ts   Wires parseFile + toRows into the Source contract (optional split from index.ts)
      ...
  cli.ts          Thin CLI dispatcher
  index.ts        Library entry point

test/
  core/           Tests for registry + runner
  sources/        Tests mirroring src/sources/
    <source-id>/
      fixtures.ts   Typed test fixtures
      *.test.ts     Unit and integration tests
      examples/     Sanitised sample input files
```
