// Core plugin contracts
export type { Source } from './core/source.js';
export { isSource } from './core/source.js';
export type { OutputFormat, Diagnostic, DiagnosticLevel, RunResult, AnyRow } from './core/types.js';
export { getSource, listSources, SOURCES } from './core/registry.js';
export { runSource } from './core/runner.js';

// Portfolio Performance output types
export type {
  PortfolioTransactionRow,
  PortfolioTransactionType,
  AccountTransactionRow,
  AccountTransactionType,
  Locale,
} from './pp/types.js';
export { generateCsv, generateAccountTransactionCsv } from './pp/csv-generator.js';

// Source plugins (default exports are Source instances; named exports are public APIs)
export { default as comdirectSecuritiesAccount } from './sources/comdirect-securities-account/index.js';
export { default as comdirectDividends } from './sources/comdirect-dividends/index.js';
export { default as dkbPortfolioTransactions } from './sources/dkb-portfolio-transactions/index.js';
export { default as degiroTransactions } from './sources/degiro-transactions/index.js';
export { default as degiroAccount } from './sources/degiro-account/index.js';
export { default as coinbaseTransactions } from './sources/coinbase-transactions/index.js';

