import { readFile } from 'fs/promises';
import type { PortfolioTransactionRow } from '../../pp/types.js';
import type { Source, SourceContext } from '../../core/source.js';
import type { OutputFormat } from '../../core/types.js';
import { parseDeGiroTransactionsCsv } from './csv-parser.js';
import { toPortfolioTransactionRow } from './transformer.js';
import type { DeGiroTransaction } from './types.js';

const source: Source<DeGiroTransaction[]> = {
  id: 'degiro-transactions',
  broker: 'DeGiro',
  title: 'Transactions (Transaktionen)',
  description: 'Parse DeGiro "Transactions.csv" export → Portfolio Transactions CSV.',
  inputKind: 'csv',
  defaultPattern: '*.csv',
  outputs: ['pp-portfolio-tx'],

  async parseFile(filePath: string, _ctx: SourceContext): Promise<DeGiroTransaction[] | null> {
    const csvText = await readFile(filePath, 'utf-8');
    const transactions = parseDeGiroTransactionsCsv(csvText);
    return transactions.length > 0 ? transactions : null;
  },

  toRows(parsed: DeGiroTransaction[], _output: OutputFormat): PortfolioTransactionRow[] {
    return parsed.map(toPortfolioTransactionRow);
  },

  summarize(parsed: DeGiroTransaction[]): string {
    return `${parsed.length} transaction(s) parsed.`;
  },
};

export default source;
export type { DeGiroTransaction, DeGiroTransactionType } from './types.js';
export { parseDeGiroTransactionsCsv } from './csv-parser.js';
export { toPortfolioTransactionRow } from './transformer.js';
export { parseGermanNumber, parseDegiroDate, parseCsvText } from './utils.js';
