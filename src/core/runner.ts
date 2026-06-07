import type { AccountTransactionRow, Locale, PortfolioTransactionRow } from '../pp/types.js';
import { generateAccountTransactionCsv, generateCsv } from '../pp/csv-generator.js';
import type { Source } from './source.js';
import type { AnyRow, Diagnostic, OutputFormat, RunResult } from './types.js';
import { globToRegExp, resolveInputFiles } from './fs.js';

// ---------------------------------------------------------------------------
// Runner options
// ---------------------------------------------------------------------------

export interface RunOptions {
  source: Source;
  input: string;
  /** Filename glob string, e.g. `'*.pdf'`.  Defaults to source.defaultPattern. */
  pattern?: string | undefined;
  locale: Locale;
  outputFormat: OutputFormat;
}

// ---------------------------------------------------------------------------
// Generic pipeline
// ---------------------------------------------------------------------------

/**
 * Run the full parse → map → emit pipeline for a given Source.
 *
 * Resolves input files, parses each one, collects diagnostics, converts to
 * rows, and serialises to CSV / JSON.  Never calls `process.exit`.
 *
 * @returns A {@link RunResult} containing rows, diagnostics, raw objects,
 *          and the final CSV / JSON string to write to stdout.
 */
export async function runSource(opts: RunOptions): Promise<RunResult & { output: string }> {
  const { source, input, locale, outputFormat } = opts;
  const patternStr = opts.pattern ?? source.defaultPattern;
  const pattern = globToRegExp(patternStr);

  // ── 1. Resolve input files ──────────────────────────────────────────────
  const files = await resolveInputFiles(input, pattern);

  const diagnostics: Diagnostic[] = [];
  const allRows: AnyRow[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawObjects: any[] = [];

  if (files.length === 0) {
    diagnostics.push({
      level: 'error',
      file: input,
      message: `No files matching pattern "${patternStr}" found in: ${input}`,
    });
    return { rows: [], rawObjects, diagnostics, outputFormat, locale, output: '' };
  }

  console.error(`Found ${files.length} file(s) to process.\n`);

  // ── 2. Parse each file ──────────────────────────────────────────────────
  const results = await Promise.allSettled(
    files.map((f) => source.parseFile(f, { verbose: true })),
  );

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const result = results[i]!;

    if (result.status === 'rejected') {
      diagnostics.push({
        level: 'error',
        file,
        message: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
      console.error(
        `[ERROR] ${file}\n        ${diagnostics[diagnostics.length - 1]!.message}\n`,
      );
      continue;
    }

    const parsed = result.value;

    if (parsed === null) {
      diagnostics.push({
        level: 'skip',
        file,
        message: `Not a recognised ${source.broker} ${source.title} document.`,
      });
      console.error(
        `[SKIP]  ${file}\n        ${diagnostics[diagnostics.length - 1]!.message}\n`,
      );
      continue;
    }

    // ── 3. Convert to rows ────────────────────────────────────────────────
    const rows = source.toRows(parsed, outputFormat);
    allRows.push(...rows);
    rawObjects.push(parsed);

    const summary = source.summarize ? source.summarize(parsed) : `${rows.length} row(s)`;
    diagnostics.push({ level: 'ok', file, message: summary });
    console.error(`[OK]    ${file}\n        ${summary}\n`);
  }

  // ── 4. Summary line ─────────────────────────────────────────────────────
  const okCount = diagnostics.filter((d) => d.level === 'ok').length;
  const skipCount = diagnostics.filter((d) => d.level === 'skip').length;
  const errCount = diagnostics.filter((d) => d.level === 'error').length;
  console.error(`Summary: ${allRows.length} row(s), ${okCount} OK, ${skipCount} skipped, ${errCount} error(s).\n`);

  // ── 5. Serialise ────────────────────────────────────────────────────────
  let output = '';
  if (outputFormat === 'json') {
    output = JSON.stringify(rawObjects, null, 2);
  } else if (outputFormat === 'pp-portfolio-tx') {
    output = generateCsv(allRows as PortfolioTransactionRow[], locale);
  } else if (outputFormat === 'pp-account-tx') {
    output = generateAccountTransactionCsv(allRows as AccountTransactionRow[], locale);
  }

  return { rows: allRows, rawObjects, diagnostics, outputFormat, locale, output };
}
