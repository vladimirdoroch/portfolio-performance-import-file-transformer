export type ComdirectTransactionType = 'buy' | 'sell';

/** Intermediate representation of a parsed comdirect "Wertpapier-Abrechnung" PDF. */
export interface ComdirectTransaction {
  type: ComdirectTransactionType;
  securityName: string;
  isin?: string;
  wkn?: string;
  shares: number;
  pricePerShare: number;
  currency: string;
  /** Total transaction value (Kurswert), excluding fees. */
  totalValue: number;
  /** Total fees (Provision + Transaktionsentgelt + other Entgelte), if any. */
  fees?: number;
  /** Trade execution date in YYYY-MM-DD format. */
  tradeDate: string;
  /** Trade execution time in HH:mm format (optional). */
  tradeTime?: string;
  /** Booking / settlement date in YYYY-MM-DD format (optional). */
  settlementDate?: string;
  cashAccount?: string;
  securitiesAccount?: string;
}
