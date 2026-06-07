import type { AccountTransactionRow } from '../../pp/types.js';
import type { Source, SourceContext } from '../../core/source.js';
import type { OutputFormat } from '../../core/types.js';
import { parsePdfFile } from './pdf-reader.js';
import { toDividendAccountTransactionRow } from './transformer.js';
import type { ComdirectDividend } from './types.js';

const source: Source<ComdirectDividend> = {
  id: 'comdirect-dividends',
  broker: 'Comdirect',
  title: 'Dividends & Distributions (Ertragsgutschrift)',
  description: 'Parse comdirect "Ertragsgutschrift" dividend/distribution PDFs → Account Transactions CSV.',
  inputKind: 'pdf',
  defaultPattern: '*.pdf',
  outputs: ['pp-account-tx'],

  parseFile(filePath: string, _ctx: SourceContext): Promise<ComdirectDividend | null> {
    return parsePdfFile(filePath);
  },

  toRows(parsed: ComdirectDividend, _output: OutputFormat): AccountTransactionRow[] {
    return [toDividendAccountTransactionRow(parsed)];
  },

  summarize(parsed: ComdirectDividend): string {
    const isinPart = parsed.isin ? ` (ISIN: ${parsed.isin})` : '';
    const wknPart = parsed.wkn ? ` (WKN: ${parsed.wkn})` : '';
    return (
      `Dividend: ${parsed.securityName}${isinPart}${wknPart}` +
      ` | ${parsed.shares} share(s) @ ${parsed.grossPerShare} ${parsed.currency}/share` +
      ` | Gross: ${parsed.grossAmount} ${parsed.currency}` +
      ` | Payment date: ${parsed.paymentDate}`
    );
  },
};

export default source;
export type { ComdirectDividend } from './types.js';
export { parseComdirectDividendText } from './text-parser.js';
export { toDividendAccountTransactionRow } from './transformer.js';
export { parsePdfFile } from './pdf-reader.js';
export { parseGermanDate, parseGermanNumber } from './utils.js';
