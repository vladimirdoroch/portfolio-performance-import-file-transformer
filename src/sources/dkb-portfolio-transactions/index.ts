import type { AccountTransactionRow } from '../../pp/types.js';
import type { Source, SourceContext } from '../../core/source.js';
import type { OutputFormat } from '../../core/types.js';
import { parsePdfFile } from './pdf-reader.js';
import { toDarlehenAccountTransactionRows } from './transformer.js';
import type { DkbDarlehenStatement } from './types.js';

const source: Source<DkbDarlehenStatement> = {
  id: 'dkb-portfolio-transactions',
  broker: 'DKB',
  title: 'Portfolio Transactions – Darlehen',
  description: 'Parse DKB "Jahreskontoauszug" loan-statement PDFs → Account Transactions CSV.',
  inputKind: 'pdf',
  defaultPattern: '*.pdf',
  outputs: ['pp-account-tx'],

  parseFile(filePath: string, _ctx: SourceContext): Promise<DkbDarlehenStatement | null> {
    return parsePdfFile(filePath);
  },

  toRows(parsed: DkbDarlehenStatement, _output: OutputFormat): AccountTransactionRow[] {
    return toDarlehenAccountTransactionRows(parsed);
  },

  summarize(parsed: DkbDarlehenStatement): string {
    return (
      `Darlehen ${parsed.accountNumber}` +
      ` | Period: ${parsed.periodStart} – ${parsed.periodEnd}` +
      ` | Entries: ${parsed.entries.length}` +
      ` | Closing balance: ${parsed.closingBalance.toFixed(2)} EUR`
    );
  },
};

export default source;
export type { DkbDarlehenEntry, DkbDarlehenEntryType, DkbDarlehenStatement, DkbStatementFormat } from './types.js';
export { parseDkbDarlehenText } from './text-parser.js';
export { toDarlehenAccountTransactionRows } from './transformer.js';
export { parsePdfFile } from './pdf-reader.js';
export { parseGermanDate, parseGermanNumber } from './utils.js';
