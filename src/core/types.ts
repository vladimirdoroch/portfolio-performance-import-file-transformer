import type { AccountTransactionRow, Locale, PortfolioTransactionRow } from '../pp/types.js';

// ---------------------------------------------------------------------------
// Output formats
// ---------------------------------------------------------------------------

/**
 * The three output shapes a Source can emit.
 *
 * - `pp-portfolio-tx` — Portfolio Performance "Portfolio Transactions" CSV.
 * - `pp-account-tx`   — Portfolio Performance "Account Transactions" CSV.
 * - `json`            — Full parsed/grouped transaction list as JSON.
 */
export type OutputFormat = 'pp-portfolio-tx' | 'pp-account-tx' | 'json';

// ---------------------------------------------------------------------------
// Diagnostic
// ---------------------------------------------------------------------------

/** Severity of a diagnostic entry. */
export type DiagnosticLevel = 'ok' | 'skip' | 'error';

/** A single per-file diagnostic emitted by the runner pipeline. */
export interface Diagnostic {
  level: DiagnosticLevel;
  file: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Source context passed to parseFile
// ---------------------------------------------------------------------------

/** Runtime context injected into every parseFile call. */
export interface SourceContext {
  /** Whether verbose per-file logging is enabled (default: true). */
  verbose: boolean;
}

// ---------------------------------------------------------------------------
// Row union type
// ---------------------------------------------------------------------------

export type AnyRow = PortfolioTransactionRow | AccountTransactionRow;

// ---------------------------------------------------------------------------
// Runner result
// ---------------------------------------------------------------------------

/** Final result returned by the generic runner. */
export interface RunResult {
  rows: AnyRow[];
  /** Raw parsed objects — only populated when outputFormat === 'json'. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawObjects: any[];
  diagnostics: Diagnostic[];
  outputFormat: OutputFormat;
  locale: Locale;
}
