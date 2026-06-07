/** Transaction direction parsed from the sign of the Anzahl field. */
export type DeGiroTransactionType = 'Buy' | 'Sell';

/**
 * Intermediate representation of a single row from a DeGiro
 * "Transaktionen" (Transactions.csv) export file.
 *
 * All monetary amounts are stored as positive numbers; the direction of the
 * transaction is captured in the {@link type} field.
 */
export interface DeGiroTransaction {
  /** Trade date in YYYY-MM-DD format (converted from DeGiro's DD-MM-YYYY). */
  date: string;
  /** Trade time in HH:MM format (as provided by DeGiro). */
  time: string;
  /** Full product / security name (Produkt). */
  securityName: string;
  /** ISIN of the security. */
  isin: string;
  /** Reference exchange code (Referenzbörse), e.g. "NDQ", "XET". */
  referenceExchange: string;
  /** Execution venue (Ausführungsort), e.g. "CDED", "XNAS". May be empty. */
  executionVenue: string;
  /** Number of shares traded (always positive; direction is in {@link type}). */
  shares: number;
  /** Price per share in {@link priceCurrency}. */
  pricePerShare: number;
  /** Currency of the execution price (unnamed column after "Kurs"), e.g. "USD". */
  priceCurrency: string;
  /** Transaction value in the local/trading currency (absolute, Wert in Lokalwährung). */
  valueLocal: number;
  /** Currency of the local transaction value (unnamed column after "Wert in Lokalwährung"), e.g. "USD". */
  localCurrency: string;
  /** Transaction value converted to EUR (absolute, Wert EUR). */
  valueEur: number;
  /**
   * Exchange rate used to convert the local currency to EUR (Wechselkurs).
   * Only present for non-EUR transactions.
   */
  exchangeRate?: number;
  /**
   * AutoFX conversion fee in EUR (AutoFX-Gebühr), if any.
   * Always positive (DeGiro reports it as negative in the CSV).
   */
  autoFxFee?: number;
  /**
   * Brokerage / third-party transaction fees in EUR
   * (Transaktionsgebühren und/oder Fremdkosten), if any.
   * Always positive (DeGiro reports it as negative in the CSV).
   */
  transactionFees?: number;
  /** Net total settlement amount in EUR (Gesamt EUR), always positive. */
  totalEur: number;
  /** DeGiro Order-ID, if present in the export. Used as a note in PP. */
  orderId?: string;
  /** Whether this is a purchase (Buy) or a sale (Sell). */
  type: DeGiroTransactionType;
}
