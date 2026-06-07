# AGENTS.md — Coding Agent Guide

This file is the authoritative guide for AI coding agents (Copilot, Codex, Claude, etc.)
working on this repository.

---

## Repository overview

**portfolio-tools** is a CLI tool that converts broker export files into
[Portfolio Performance](https://help.portfolio-performance.info/en/) import CSVs.

Run without compilation:
```bash
bun src/cli.ts list
bun src/cli.ts convert <source-id> <path> [--pattern <glob>] [--locale en|de] [--output <format>]
```

Build for Node.js:
```bash
npm run build          # tsc → dist/
node dist/cli.js list
```

---

## Architecture

```
src/
  core/
    types.ts         OutputFormat, Diagnostic, RunResult — the shared vocabulary
    source.ts        Source<T> interface — the plugin contract
    fs.ts            globToRegExp, collectFiles, resolveInputFiles
    runner.ts        runSource() — generic parse → map → emit pipeline
    registry.ts      SOURCES map; getSource(), listSources()
  pp/
    types.ts         PortfolioTransactionRow, AccountTransactionRow, Locale
    csv-generator.ts generateCsv(), generateAccountTransactionCsv()
    schemas/         Markdown docs for PP CSV column semantics
  sources/
    <source-id>/
      index.ts       default export: Source<T>; named exports: public API
      types.ts       Intermediate domain type (e.g. ComdirectTransaction)
      text-parser.ts or csv-parser.ts — raw input → domain type
      transformer.ts domain type → PortfolioTransactionRow[] | AccountTransactionRow[]
      pdf-reader.ts  (PDF sources only) reads file and calls text-parser
      utils.ts       (optional) shared helpers
  cli.ts             Thin dispatcher: list / convert / help + legacy shim
  index.ts           Library entry point (re-exports core + sources)

test/
  core/              Tests for registry + runner
  sources/
    <source-id>/
      fixtures.ts    Typed test fixtures
      *.test.ts      Unit + integration tests
      examples/      Sanitised sample input files (no PII)
```

### Output formats

| Identifier       | PP import type            |
|------------------|---------------------------|
| `pp-portfolio-tx`| Portfolio Transactions CSV|
| `pp-account-tx`  | Account Transactions CSV  |
| `json`           | Raw parsed objects as JSON|

---

## How to add a new source

### Step 1 — Create the plugin folder

```
src/sources/<broker>-<tool>/
```

Use kebab-case, e.g. `comdirect-dividends`, `degiro-account`.

### Step 2 — Implement the files

**`types.ts`** — Define the intermediate domain type:
```ts
export interface MySourceRecord {
  date: string;      // YYYY-MM-DD
  securityName: string;
  // ...
}
```

**`text-parser.ts`** (for PDF sources) or **`csv-parser.ts`** (for CSV sources):
```ts
import type { MySourceRecord } from './types.js';

export function parseMySourceText(rawText: string): MySourceRecord | null {
  // Return null when the document is not recognised (not an error).
  // Throw an Error when the document is recognised but cannot be parsed.
}
```

**`transformer.ts`**:
```ts
import type { MySourceRecord } from './types.js';
import type { PortfolioTransactionRow } from '../../pp/types.js';

export function toPortfolioTransactionRow(record: MySourceRecord): PortfolioTransactionRow {
  return { date: record.date, /* ... */ };
}
```

**`pdf-reader.ts`** (PDF sources only):
```ts
import { readFile } from 'fs/promises';
import { PDFParse } from 'pdf-parse';
import type { MySourceRecord } from './types.js';
import { parseMySourceText } from './text-parser.js';

export async function parsePdfFile(filePath: string): Promise<MySourceRecord | null> {
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: buffer });
  const { text } = await parser.getText();
  return parseMySourceText(text);
}
```

**`index.ts`** — Wire everything into a `Source<T>`:
```ts
import type { Source, SourceContext } from '../../core/source.js';
import type { OutputFormat } from '../../core/types.js';
import type { PortfolioTransactionRow } from '../../pp/types.js';
import { parsePdfFile } from './pdf-reader.js';
import { toPortfolioTransactionRow } from './transformer.js';
import type { MySourceRecord } from './types.js';

const source: Source<MySourceRecord> = {
  id: 'mybroker-mytool',
  broker: 'MyBroker',
  title: 'My Tool',
  description: 'One-sentence description.',
  inputKind: 'pdf',
  defaultPattern: '*.pdf',
  outputs: ['pp-portfolio-tx'],

  parseFile(filePath: string, _ctx: SourceContext): Promise<MySourceRecord | null> {
    return parsePdfFile(filePath);
  },

  toRows(parsed: MySourceRecord, _output: OutputFormat): PortfolioTransactionRow[] {
    return [toPortfolioTransactionRow(parsed)];
  },

  summarize(parsed: MySourceRecord): string {
    return `${parsed.securityName} | ${parsed.date}`;
  },
};

export default source;
```

### Step 3 — Register the source

In `src/core/registry.ts`:
```ts
import myBrokerMyTool from '../sources/mybroker-mytool/index.js';

const SOURCES: Record<string, Source> = {
  // ... existing entries ...
  [myBrokerMyTool.id]: myBrokerMyTool,
};
```

### Step 4 — Write tests

Create `test/sources/mybroker-mytool/fixtures.ts` with typed expected values,
then `text-parser.test.ts` and `transformer.test.ts`. Integration tests that
read real files go in `pdf.integration.test.ts` (or `csv.integration.test.ts`).

Place sanitised sample files in `test/sources/mybroker-mytool/examples/`.

### Step 5 — Update README.md

Add a row to the "Supported sources" table and a per-source `README.md` if needed.

---

## Rules — DO

- Return `null` from `parseFile` when a file is not recognised.
- Throw an `Error` from `parseFile` when the file is recognised but cannot be fully parsed.
- Use spread patterns for optional properties when `exactOptionalPropertyTypes` is enabled:
  ```ts
  ...(value !== undefined && { key: value })
  ```
- Import Portfolio Performance types from `../../pp/types.js`.
- Import core interfaces from `../../core/source.js` and `../../core/types.js`.
- Use `.js` extensions on all relative imports (NodeNext resolution).
- Keep `src/pp/csv-generator.ts` as the single CSV serialisation point.

## Rules — DON'T

- **Never call `process.exit` inside a source plugin.** Only the runner and CLI may do that.
- **Never commit real financial documents.** Sanitise all fixtures (replace names, IBANs,
  account numbers, amounts with plausible but fake values).
- **Never add `console.log` to source modules.** Diagnostic output goes through the runner
  via return values / throws.
- **Don't modify `src/pp/types.ts` column headers** without updating the corresponding German
  translation maps and all tests.
- **Don't add dependencies** without discussing it first — the project intentionally has very
  few runtime dependencies (`pdf-parse` only).

---

## Test commands

```bash
npm test               # Full Vitest suite
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint
npm run format:check   # Prettier check
npm run build          # Compile to dist/
```

## Bun (run from source, no build needed)

```bash
bun src/cli.ts list
bun src/cli.ts convert comdirect-securities-account ./docs --pattern "Wertpapier*.pdf"
bun src/cli.ts convert degiro-account Account.csv --output json
```

## Key files

| File | Purpose |
|---|---|
| `src/core/source.ts` | `Source<T>` interface — the plugin contract |
| `src/core/registry.ts` | Register new sources here |
| `src/core/runner.ts` | Generic parse → map → emit pipeline |
| `src/pp/types.ts` | PP output row types and column header maps |
| `src/cli.ts` | Thin CLI dispatcher |
| `CONTRIBUTING.md` | Development setup and contribution guide |
