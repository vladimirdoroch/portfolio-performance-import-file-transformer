import { readFile } from 'fs/promises';
import type { AccountTransactionRow } from '../../pp/types.js';
import type { Source, SourceContext } from '../../core/source.js';
import type { OutputFormat } from '../../core/types.js';
import { parseCoinbaseCsv } from './csv-parser.js';
import { toCoinbaseAccountTransactionRows } from './transformer.js';
import type { CoinbaseTransaction } from './types.js';

const source: Source<CoinbaseTransaction[]> = {
  id: 'coinbase-transactions',
  broker: 'Coinbase',
  title: 'Transactions (Standard CSV)',
  description: 'Parse Coinbase "Standard CSV" export → Account Transactions CSV (trades, staking, deposits).',
  inputKind: 'csv',
  defaultPattern: '*.csv',
  outputs: ['pp-account-tx'],

  async parseFile(filePath: string, _ctx: SourceContext): Promise<CoinbaseTransaction[] | null> {
    const csvText = await readFile(filePath, 'utf-8');
    const transactions = parseCoinbaseCsv(csvText);
    return transactions.length > 0 ? transactions : null;
  },

  toRows(parsed: CoinbaseTransaction[], _output: OutputFormat): AccountTransactionRow[] {
    return toCoinbaseAccountTransactionRows(parsed);
  },

  summarize(parsed: CoinbaseTransaction[]): string {
    const byType = new Map<string, number>();
    for (const tx of parsed) {
      byType.set(tx.type, (byType.get(tx.type) ?? 0) + 1);
    }
    const breakdown = [...byType.entries()].map(([t, c]) => `${t}: ${c}`).join(', ');
    return `${parsed.length} transaction(s) — ${breakdown}`;
  },
};

export default source;
export type { CoinbaseTransaction, CoinbaseTransactionType } from './types.js';
export { parseCoinbaseCsv } from './csv-parser.js';
export { toCoinbaseAccountTransactionRows } from './transformer.js';
