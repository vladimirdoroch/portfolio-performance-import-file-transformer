import type { PortfolioTransactionRow } from '../../pp/types.js';
import type { Source, SourceContext } from '../../core/source.js';
import type { OutputFormat } from '../../core/types.js';
import { parsePdfFile } from './pdf-reader.js';
import { toPortfolioTransactionRow } from './transformer.js';
import type { ComdirectTransaction } from './types.js';

const source: Source<ComdirectTransaction> = {
  id: 'comdirect-securities-account',
  broker: 'Comdirect',
  title: 'Securities Account (Wertpapier-Abrechnung)',
  description: 'Parse comdirect "Wertpapier-Abrechnung" trade-confirmation PDFs → Portfolio Transactions CSV.',
  inputKind: 'pdf',
  defaultPattern: '*.pdf',
  outputs: ['pp-portfolio-tx'],

  parseFile(filePath: string, _ctx: SourceContext): Promise<ComdirectTransaction | null> {
    return parsePdfFile(filePath);
  },

  toRows(parsed: ComdirectTransaction, _output: OutputFormat): PortfolioTransactionRow[] {
    return [toPortfolioTransactionRow(parsed)];
  },

  summarize(parsed: ComdirectTransaction): string {
    const label = parsed.type === 'buy' ? 'Buy' : 'Sell';
    const isinPart = parsed.isin ? ` (ISIN: ${parsed.isin})` : '';
    const wknPart = parsed.wkn ? ` (WKN: ${parsed.wkn})` : '';
    const feesPart = parsed.fees !== undefined ? ` | Fees: ${parsed.fees} ${parsed.currency}` : '';
    return (
      `${label}: ${parsed.securityName}${isinPart}${wknPart}` +
      ` | ${parsed.shares} share(s) @ ${parsed.pricePerShare} ${parsed.currency}` +
      ` | Total: ${parsed.totalValue} ${parsed.currency}${feesPart}` +
      ` | Date: ${parsed.tradeDate}`
    );
  },
};

export default source;
export type { ComdirectTransaction, ComdirectTransactionType } from './types.js';
export { parseComdirectText } from './text-parser.js';
export { toPortfolioTransactionRow } from './transformer.js';
export { parsePdfFile } from './pdf-reader.js';
export { generateCsv } from './csv-generator.js';
export { parseGermanDate, parseGermanNumber } from './utils.js';
