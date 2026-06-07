import { readFile } from 'fs/promises';
import type { AccountTransactionRow, PortfolioTransactionRow } from '../../pp/types.js';
import type { Source, SourceContext } from '../../core/source.js';
import type { OutputFormat } from '../../core/types.js';
import { parseAccountCsv } from './csv-parser.js';
import { groupAccountRows } from './grouper.js';
import { toPortfolioTransactionRows } from './transformer.js';
import { toAccountTransactionRows } from './account-transformer.js';
import type { AccountTransaction } from './types.js';

const source: Source<AccountTransaction[]> = {
  id: 'degiro-account',
  broker: 'DeGiro',
  title: 'Account Statement (Konto / Account.csv)',
  description: 'Parse DeGiro "Account.csv" export → Portfolio Transactions or Account Transactions CSV.',
  inputKind: 'csv',
  defaultPattern: '*.csv',
  outputs: ['pp-portfolio-tx', 'pp-account-tx', 'json'],

  async parseFile(filePath: string, _ctx: SourceContext): Promise<AccountTransaction[] | null> {
    const csvText = await readFile(filePath, 'utf-8');
    const rows = parseAccountCsv(csvText);
    const transactions = groupAccountRows(rows);
    return transactions.length > 0 ? transactions : null;
  },

  toRows(
    parsed: AccountTransaction[],
    output: OutputFormat,
  ): PortfolioTransactionRow[] | AccountTransactionRow[] {
    if (output === 'pp-account-tx') {
      return toAccountTransactionRows(parsed);
    }
    return toPortfolioTransactionRows(parsed);
  },

  summarize(parsed: AccountTransaction[]): string {
    const byType = new Map<string, number>();
    for (const tx of parsed) {
      byType.set(tx.type, (byType.get(tx.type) ?? 0) + 1);
    }
    const breakdown = [...byType.entries()].map(([t, c]) => `${t}: ${c}`).join(', ');
    return `${parsed.length} transaction(s) — ${breakdown}`;
  },
};

export default source;
export type {
  AccountBookingRow,
  AccountTransaction,
  BookingType,
  CashSweepTransaction,
  CorporateActionTransaction,
  DepositTransaction,
  DividendTransaction,
  FxConversionPair,
  FxConversionTransaction,
  InterestTransaction,
  MarketAccessFeeTransaction,
  MoneyMarketConversionTransaction,
  MoneyMarketPriceChangeTransaction,
  PaymentFeeTransaction,
  StockSplitTransaction,
  TradeFillDetail,
  TradeTransaction,
  UnknownTransaction,
} from './types.js';
export { parseAccountCsv } from './csv-parser.js';
export { groupAccountRows } from './grouper.js';
export { toPortfolioTransactionRows } from './transformer.js';
export { toAccountTransactionRows } from './account-transformer.js';
