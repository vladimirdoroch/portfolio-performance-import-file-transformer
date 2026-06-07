import type { Source } from './source.js';
import comdirectSecuritiesAccount from '../sources/comdirect-securities-account/index.js';
import dkbPortfolioTransactions from '../sources/dkb-portfolio-transactions/index.js';
import degiroTransactions from '../sources/degiro-transactions/index.js';
import degiroAccount from '../sources/degiro-account/index.js';
import coinbaseTransactions from '../sources/coinbase-transactions/index.js';
import comdirectDividends from '../sources/comdirect-dividends/index.js';

// ---------------------------------------------------------------------------
// Built-in sources registry
// ---------------------------------------------------------------------------

/**
 * All built-in sources, keyed by their stable `id`.
 * Import a new Source and add it here to make it available in the CLI.
 */
const SOURCES: Record<string, Source> = {
  [comdirectSecuritiesAccount.id]: comdirectSecuritiesAccount,
  [dkbPortfolioTransactions.id]: dkbPortfolioTransactions,
  [degiroTransactions.id]: degiroTransactions,
  [degiroAccount.id]: degiroAccount,
  [coinbaseTransactions.id]: coinbaseTransactions,
  [comdirectDividends.id]: comdirectDividends,
};

/**
 * Retrieve a source by its stable `id`.
 * @returns The matching {@link Source}, or `undefined` when not found.
 */
export function getSource(id: string): Source | undefined {
  return SOURCES[id];
}

/** Return all registered sources as an array, in registration order. */
export function listSources(): Source[] {
  return Object.values(SOURCES);
}

export { SOURCES };
