import type { Locale, PortfolioTransactionRow, PortfolioTransactionType } from '../../pp/types.js';
import {
  PP_PORTFOLIO_TRANSACTION_HEADERS_DE,
  PP_PORTFOLIO_TRANSACTION_HEADERS_EN,
  PP_PORTFOLIO_TRANSACTION_TYPE_DE,
} from '../../pp/types.js';

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
 * @param rows - One or more portfolio transaction rows to serialize.
 * @param locale - Locale for CSV headers: `'de'` (default) or `'en'`.
 * @returns CSV string including a header row.
 */
export function generateCsv(rows: PortfolioTransactionRow[], locale: Locale = 'de'): string {
  if (rows.length === 0) {
    return '';
  }

  const headers = locale === 'de' ? PP_PORTFOLIO_TRANSACTION_HEADERS_DE : PP_PORTFOLIO_TRANSACTION_HEADERS_EN;

  // Determine which columns are populated in at least one row.
  const activeColumns = COLUMN_ORDER.filter((col) =>
    rows.some((row) => row[col] !== undefined),
  );

  const header = activeColumns.map((col) => headers[col]).join(';');

  const dataRows = rows.map((row) =>
    activeColumns
      .map((col) => {
        const raw = row[col];
        if (raw === undefined) {
          return '';
        }
        let cell = String(raw);
        if (col === 'type' && locale === 'de') {
          cell = PP_PORTFOLIO_TRANSACTION_TYPE_DE[raw as PortfolioTransactionType] ?? cell;
        }
        // Quote cell if it contains the delimiter, a double-quote, or a newline
        if (cell.includes(';') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      })
      .join(';'),
  );

  return [header, ...dataRows].join('\n');
}
