import type { AccountTransactionRow, PortfolioTransactionRow } from '../pp/types.js';
import type { AnyRow, OutputFormat, SourceContext } from './types.js';
export type { SourceContext } from './types.js';

// ---------------------------------------------------------------------------
// Source interface
// ---------------------------------------------------------------------------

/**
 * A Source is a self-contained plugin that knows how to:
 * 1. Read one input file (PDF or CSV) and parse it into a typed domain object.
 * 2. Convert that domain object into Portfolio Performance rows.
 *
 * The generic parameter `TParsed` is the intermediate representation produced
 * by `parseFile`; it is consumed by `toRows` and (optionally) `summarize`.
 *
 * Implement this interface and register the instance in `src/core/registry.ts`
 * to add a new data source.  See `AGENTS.md` for a step-by-step guide.
 */
export interface Source<TParsed = unknown> {
  /**
   * Stable kebab-case identifier used as the CLI argument.
   * @example 'comdirect-securities-account'
   */
  readonly id: string;

  /** Human-readable broker name, e.g. `'Comdirect'`. */
  readonly broker: string;

  /** Short human-readable title, e.g. `'Securities Account (Wertpapier-Abrechnung)'`. */
  readonly title: string;

  /** One-sentence description shown in `portfolio-tools list`. */
  readonly description: string;

  /** Whether this source reads PDF or CSV input files. */
  readonly inputKind: 'pdf' | 'csv';

  /**
   * Default filename glob when the user passes a directory as input.
   * @example '*.pdf'
   */
  readonly defaultPattern: string;

  /**
   * Output formats this source supports, in preference order.
   * The first entry is used as the default when `--output` is not specified.
   */
  readonly outputs: readonly OutputFormat[];

  /**
   * Parse a single input file and return the intermediate representation.
   *
   * - Return `null` when the file is valid but not recognised as a document
   *   this source handles (e.g. a different PDF type from the same broker).
   *   The runner will log a `[SKIP]` diagnostic.
   * - Throw an `Error` when the file looks like the expected type but cannot
   *   be fully parsed.  The runner will log an `[ERROR]` diagnostic.
   * - **Never** call `process.exit` inside this method.
   *
   * @param filePath - Absolute path to the input file.
   * @param ctx      - Runtime context (verbose flag, etc.).
   */
  parseFile(filePath: string, ctx: SourceContext): Promise<TParsed | null>;

  /**
   * Convert a parsed domain object into output rows for the given format.
   *
   * Only called when `parseFile` returned a non-null value.
   *
   * @param parsed - The domain object returned by `parseFile`.
   * @param output - The requested output format.
   * @returns An array of Portfolio Performance rows (type depends on `output`).
   */
  toRows(parsed: TParsed, output: OutputFormat): PortfolioTransactionRow[] | AccountTransactionRow[];

  /**
   * Optional: return a one-line human-readable summary of a parsed file for
   * the `[OK]` diagnostic line (e.g. "Buy: NVIDIA Corp. | 2 shares @ 950 EUR").
   * When absent, the runner just reports the file name and row count.
   */
  summarize?(parsed: TParsed): string;
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

export function isSource(value: unknown): value is Source {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Source).id === 'string' &&
    typeof (value as Source).parseFile === 'function' &&
    typeof (value as Source).toRows === 'function'
  );
}

// ---------------------------------------------------------------------------
// Row type helpers
// ---------------------------------------------------------------------------

export function isPortfolioTransactionRows(
  rows: AnyRow[],
): rows is PortfolioTransactionRow[] {
  return rows.length === 0 || 'shares' in rows[0]!;
}
