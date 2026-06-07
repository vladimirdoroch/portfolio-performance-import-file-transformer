import type { AccountTransactionRow, AccountTransactionType, Locale, PortfolioTransactionRow, PortfolioTransactionType } from './types.js';
import {
  PP_ACCOUNT_TRANSACTION_HEADERS_DE,
  PP_ACCOUNT_TRANSACTION_HEADERS_EN,
  PP_ACCOUNT_TRANSACTION_TYPE_DE,
  PP_PORTFOLIO_TRANSACTION_HEADERS_DE,
  PP_PORTFOLIO_TRANSACTION_HEADERS_EN,
  PP_PORTFOLIO_TRANSACTION_TYPE_DE,
} from './types.js';

/** Column order used when generating the CSV. */
const COLUMN_ORDER: ReadonlyArray<keyof PortfolioTransactionRow> = [
  'date',
  'type',
  'shares',
  'value',
  'securityName',
  'isin',
  'wkn',
  'tickerSymbol',
  'transactionCurrency',
  'fees',
  'taxes',
  'grossAmount',
  'currencyGrossAmount',
  'exchangeRate',
  'time',
  'cashAccount',
  'securitiesAccount',
  'offsetAccount',
  'note',
];

/**
 * Generate a Portfolio Performance "Portfolio Transactions" import CSV string
 * from one or more {@link PortfolioTransactionRow} objects.
 *
 * - Columns are ordered per {@link COLUMN_ORDER}; columns that have no value
 *   in any row are omitted entirely.
 * - Values are separated by semicolons (`;`) as Portfolio Performance's
 *   default delimiter.
 * - Fields that contain the delimiter or a double-quote are RFC 4180 quoted.
 * - Numbers use a period as the decimal separator.
 *
 * @param rows   - One or more portfolio transaction rows to serialise.
 * @param locale - Locale for CSV column headers: `'de'` (default) or `'en'`.
 * @returns CSV string including a header row, or empty string for empty input.
 */
export function generateCsv(rows: PortfolioTransactionRow[], locale: Locale = 'de'): string {
  if (rows.length === 0) return '';

  const headers =
    locale === 'de' ? PP_PORTFOLIO_TRANSACTION_HEADERS_DE : PP_PORTFOLIO_TRANSACTION_HEADERS_EN;

  // Determine which columns are populated in at least one row.
  const activeColumns = COLUMN_ORDER.filter((col) =>
    rows.some((row) => row[col] !== undefined),
  );

  const header = activeColumns.map((col) => headers[col]).join(';');

  const dataRows = rows.map((row) =>
    activeColumns
      .map((col) => {
        const raw = row[col];
        if (raw === undefined) return '';
        let cell = String(raw);
        if (col === 'type' && locale === 'de') {
          cell = PP_PORTFOLIO_TRANSACTION_TYPE_DE[raw as PortfolioTransactionType] ?? cell;
        }
        if (cell.includes(';') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      })
      .join(';'),
  );

  return [header, ...dataRows].join('\n');
}

/** Column order for Account Transactions CSV. */
const ACCOUNT_COLUMN_ORDER: ReadonlyArray<keyof AccountTransactionRow> = [
  'date',
  'type',
  'value',
  'transactionCurrency',
  'shares',
  'securityName',
  'isin',
  'wkn',
  'tickerSymbol',
  'fees',
  'taxes',
  'grossAmount',
  'currencyGrossAmount',
  'exchangeRate',
  'time',
  'cashAccount',
  'securitiesAccount',
  'offsetAccount',
  'note',
];

/**
 * Generate a Portfolio Performance "Account Transactions" import CSV string
 * from one or more {@link AccountTransactionRow} objects.
 *
 * @param rows   - One or more account transaction rows to serialise.
 * @param locale - Locale for CSV column headers: `'de'` (default) or `'en'`.
 * @returns CSV string including a header row, or empty string for empty input.
 */
export function generateAccountTransactionCsv(rows: AccountTransactionRow[], locale: Locale = 'de'): string {
  if (rows.length === 0) return '';

  const headers =
    locale === 'de' ? PP_ACCOUNT_TRANSACTION_HEADERS_DE : PP_ACCOUNT_TRANSACTION_HEADERS_EN;

  const activeColumns = ACCOUNT_COLUMN_ORDER.filter((col) =>
    rows.some((row) => row[col] !== undefined),
  );

  const header = activeColumns.map((col) => headers[col]).join(';');

  const dataRows = rows.map((row) =>
    activeColumns
      .map((col) => {
        const raw = row[col];
        if (raw === undefined) return '';
        let cell = String(raw);
        if (col === 'type' && locale === 'de') {
          cell = PP_ACCOUNT_TRANSACTION_TYPE_DE[raw as AccountTransactionType] ?? cell;
        }
        if (cell.includes(';') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      })
      .join(';'),
  );

  return [header, ...dataRows].join('\n');
}
