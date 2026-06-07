/**
 * Classification of a single row in the DEGIRO Account.csv export.
 *
 * The classification is derived from the `Beschreibung` (description) column.
 * See README.md for full details of each type.
 */
export type BookingType =
  // ── Securities trades ────────────────────────────────────────────────────
  | 'Buy'              // "Kauf N zu je P CUR (ISIN)"
  | 'Sell'             // "Verkauf N zu je P CUR (ISIN)"
  | 'FusionBuy'              // "FUSION: Kauf N zu je P CUR (ISIN)"
  | 'FusionSell'             // "FUSION: Verkauf N zu je P CUR (ISIN)"
  | 'DelistingBuy'           // "DELISTING: Kauf N zu je P CUR (ISIN)"
  | 'DelistingSell'          // "DELISTING: Verkauf N zu je P CUR (ISIN)"
  | 'CapitalIncreaseBuy'     // "KAPITALERHÖHUNG: Kauf N zu je P CUR (ISIN)"
  | 'CapitalIncreaseSell'    // "KAPITALERHÖHUNG: Verkauf N zu je P CUR (ISIN)"
  | 'StockSplitDebit'        // "AKTIENSPLIT: …" row with negative changeAmount (old position out)
  | 'StockSplitCredit'       // "AKTIENSPLIT: …" row with positive changeAmount (new position in)

  // ── FX conversion ────────────────────────────────────────────────────────
  | 'FxDebit'          // "Währungswechsel (Ausbuchung)"
  | 'FxCredit'         // "Währungswechsel (Einbuchung)"

  // ── Dividends ────────────────────────────────────────────────────────────
  | 'Dividend'         // "Dividende"
  | 'DividendTax'      // "Dividendensteuer"
  | 'AdrFee'           // "ADR/GDR Weitergabegebühr"

  // ── Fees ─────────────────────────────────────────────────────────────────
  | 'TransactionFee'   // "DEGIRO Transaktionsgebühren und/oder Fremdkosten"
  | 'MarketAccessFee'  // "Einrichtung von Handelsmodalitäten YYYY (Exchange - CODE)"
  | 'PaymentFee'       // "SOFORT Zahlungsgebühr"

  // ── Money market fund ──────────────────────────────────────────────────────
  | 'MoneyMarketPriceChange' // "Geldmarktfonds Preisänderung (EUR)"
  | 'MoneyMarketBuy'         // "Geldmarktfonds Umwandlung: Kauf N zu je P EUR"
  | 'MoneyMarketSell'        // "Geldmarktfonds Umwandlung: Verkauf N zu je P EUR"

  // ── Cash movements ───────────────────────────────────────────────────────
  | 'FlatexDeposit'          // "flatex Einzahlung"
  | 'InstantDeposit'         // "Soforteinzahlung" / "SOFORT Einzahlung"
  | 'Deposit'                // "Einzahlung" (generic)
  | 'FlatexWithdrawal'     // "Auszahlung von Ihrem Geldkonto bei der flatexDEGIRO Bank: …"
  | 'FlatexTransfer'       // "Überweisung auf Ihr Geldkonto bei der flatexDEGIRO Bank: …"
  | 'CashSweep'            // "Degiro Cash Sweep Transfer"
  | 'PaymentReservation'   // "Reservation iDEAL"

  // ── Interest ─────────────────────────────────────────────────────────────
  | 'InterestIncome'   // "Flatex Interest Income"
  | 'InterestCharge'   // "Zinsen" / "Flatex Interest" (negative amount)

  | 'Unknown';         // unrecognised description — should not occur in practice

// ─── Raw parsed row ──────────────────────────────────────────────────────────

/**
 * A single row from the DEGIRO Account.csv export after parsing all fields.
 *
 * Column mapping (0-indexed):
 *  0  Datum          → date
 *  1  Uhrzeit        → time
 *  2  Valutadatum    → valueDate
 *  3  Produkt        → product
 *  4  ISIN           → isin
 *  5  Beschreibung   → description / bookingType
 *  6  FX             → fxRate
 *  7  Änderung (cur) → changeCurrency
 *  8  Änderung (amt) → changeAmount
 *  9  Saldo (cur)    → balanceCurrency
 * 10  Saldo (amt)    → balance
 * 11  Order-ID       → orderId
 */
export interface AccountBookingRow {
  /** Booking date in YYYY-MM-DD (converted from DD-MM-YYYY). */
  date: string;
  /** Booking time in HH:MM. */
  time: string;
  /** Value / settlement date in YYYY-MM-DD. */
  valueDate: string;
  /** Security name (Produkt). Absent for cash-only rows. */
  product?: string;
  /** Security ISIN. Absent for cash-only rows. */
  isin?: string;
  /** Raw booking description as it appears in the CSV. */
  description: string;
  /** Derived classification of this row. */
  bookingType: BookingType;
  /**
   * FX rate used for this conversion row (col 6).
   * Expressed as `foreign currency per EUR` (e.g. 1.1643 means 1 EUR = 1.1643 USD).
   * Present only on FxDebit / FxCredit rows that carry the rate.
   */
  fxRate?: number;
  /**
   * Currency of the amount change (col 7).
   * Absent for flatex bank-entry rows (FlatexWithdrawal / FlatexTransfer),
   * which only record the resulting balance.
   */
  changeCurrency?: string;
  /**
   * Signed amount of the change (col 8).
   * Negative = money leaving the account; positive = money arriving.
   * Absent for flatex bank-entry rows.
   */
  changeAmount?: number;
  /** Currency of the running balance (col 9). Typically EUR. */
  balanceCurrency: string;
  /** Running DEGIRO cash account balance after this row (col 10). */
  balance: number;
  /**
   * DEGIRO Order-ID (UUID, col 11).
   * All rows belonging to the same trade share one Order-ID.
   * Absent for cash, dividend, and standalone FX rows.
   */
  orderId?: string;
}

// ─── Parsed trade-fill detail ─────────────────────────────────────────────────

/**
 * Structured data extracted from a single Buy / Sell booking description,
 * e.g. "Kauf 268 zu je 41,4 USD (US46222L1089)".
 */
export interface TradeFillDetail {
  /** Number of shares executed in this fill (always positive). */
  shares: number;
  /** Execution price per share. */
  pricePerShare: number;
  /** Execution currency (e.g. "USD", "EUR"). */
  currency: string;
  /** Gross value of this fill (shares × pricePerShare, always positive). */
  value: number;
}

// ─── Logical transaction types ───────────────────────────────────────────────

/**
 * A single FX conversion pair that settles one trade fill:
 * one Ausbuchung (debit) and one Einbuchung (credit) row.
 *
 * For a USD buy:  debit = EUR out, credit = USD in.
 * For a USD sell: debit = USD out, credit = EUR in.
 */
export interface FxConversionPair {
  debit: AccountBookingRow;   // Währungswechsel (Ausbuchung)
  credit: AccountBookingRow;  // Währungswechsel (Einbuchung)
}

/**
 * A securities trade (buy or sell), potentially split across multiple exchange
 * fills, with associated FX conversions and a single fee row.
 *
 * One logical trade = one DEGIRO Order-ID.
 *
 * Row composition (all share the same orderId):
 *   - 1..N  TradeFill rows  (Buy | Sell)
 *   - 0..N  FxConversionPairs  (one per fill for non-EUR securities)
 *   - 0..1  TransactionFee row
 */
export interface TradeTransaction {
  type: 'Trade';
  orderId: string;
  /** Direction of the trade. */
  side: 'Buy' | 'Sell';
  /** All individual exchange fills for this order. */
  fills: AccountBookingRow[];
  /**
   * Parsed detail for each fill (parallel array to `fills`).
   * Contains shares, price, currency, and gross value extracted from the description.
   */
  fillDetails: TradeFillDetail[];
  /**
   * FX conversion pairs — one pair per fill for foreign-currency securities.
   * Empty for EUR-denominated trades.
   */
  fxConversions: FxConversionPair[];
  /** DEGIRO transaction fee row, if present. */
  fee?: AccountBookingRow;
  /** Date of the first fill (YYYY-MM-DD). */
  date: string;
  /** Security name. */
  product: string;
  /** Security ISIN. */
  isin: string;
}

/**
 * A corporate action that converts shares from one security to another
 * (FUSION / merger). Contains the outgoing leg and the incoming leg.
 *
 * Row composition (same orderId):
 *   - 1  FusionSell row  (old security, negative change)
 *   - 1  FusionBuy  row  (new security, negative change = cost, or neutral)
 */
export interface CorporateActionTransaction {
  type: 'CorporateAction';
  /** Order-ID when present (absent in older DEGIRO exports). */
  orderId?: string;
  sells: AccountBookingRow[];  // FusionSell / DelistingSell / CapitalIncreaseSell rows
  buys: AccountBookingRow[];   // FusionBuy  / DelistingBuy  / CapitalIncreaseBuy  rows
  date: string;
  /**
   * Standalone FX conversion posted by DEGIRO to convert the net foreign-
   * currency proceeds of this corporate action to EUR.
   * Absent when the action is EUR-denominated or the conversion cannot be matched.
   */
  fxConversion?: FxConversionPair;
}

/**
 * A stock split, represented by two AKTIENSPLIT rows: one debit (old
 * position removed at old price) and one credit (new position added at
 * adjusted price). No Order-ID is present.
 *
 * Row composition:
 *   - 1  StockSplitDebit  row  (old shares out)
 *   - 1  StockSplitCredit row  (new shares in)
 */
export interface StockSplitTransaction {
  type: 'StockSplit';
  debit: AccountBookingRow;   // StockSplitDebit
  credit: AccountBookingRow;  // StockSplitCredit
  date: string;
  product: string;
  isin: string;
}

/**
 * A dividend payment for one security on one ex-date.
 *
 * DEGIRO sometimes posts corrections (reversals) before the final booking.
 * All rows for the same (isin, valueDate) are collected here; the net amounts
 * can be obtained by summing changeAmount across the respective sub-arrays.
 *
 * Row composition (no Order-ID; grouped by isin + valueDate):
 *   - 1..N  Dividend    rows  (gross dividend; negative = reversal)
 *   - 0..N  DividendTax rows  (withholding tax; negative = charge, positive = reversal)
 *   - 0..N  AdrFee      rows  (ADR/GDR custody fee; negative = charge, positive = reversal)
 */
export interface DividendTransaction {
  type: 'Dividend';
  isin: string;
  product: string;
  /** Ex-dividend date in YYYY-MM-DD (= valueDate of the dividend rows). */
  exDate: string;
  /** All Dividende rows (including corrections). */
  dividends: AccountBookingRow[];
  /** All Dividendensteuer rows (including corrections). */
  taxes: AccountBookingRow[];
  /** All ADR/GDR Weitergabegebühr rows (including corrections). */
  adrFees: AccountBookingRow[];
  /**
   * Standalone FX conversion pair that settled the net dividend proceeds into
   * EUR. Linked by the grouper when the debit amount of a standalone
   * FxConversion matches the net dividend (gross – tax – ADR fees).
   * Absent for EUR-denominated dividends or when no matching pair is found.
   */
  fxConversion?: FxConversionPair;
}

/**
 * A standalone FX conversion with no associated trade or Order-ID.
 * Occurs when DEGIRO converts dividend or interest proceeds from foreign
 * currency to EUR.
 *
 * Row composition (grouped by date + time, no ISIN):
 *   - 1  FxDebit  row  (Ausbuchung — source currency out)
 *   - 1  FxCredit row  (Einbuchung — target currency in)
 */
export interface FxConversionTransaction {
  type: 'FxConversion';
  debit: AccountBookingRow;
  credit: AccountBookingRow;
  date: string;
}

/**
 * A DEGIRO ↔ flatex cash sweep, always composed of exactly two paired rows
 * at the same date and time.
 *
 * Row composition:
 *   - 1  CashSweep        row  (Degiro Cash Sweep Transfer; has changeAmount)
 *   - 1  FlatexWithdrawal or FlatexTransfer row  (bank-side entry; no changeAmount)
 */
export interface CashSweepTransaction {
  type: 'CashSweep';
  sweep: AccountBookingRow;      // CashSweep
  bankEntry: AccountBookingRow;  // FlatexWithdrawal | FlatexTransfer
  date: string;
}

/**
 * A cash deposit into the DEGIRO account.
 *
 * Variants:
 *   - FlatexDeposit   — "flatex Einzahlung"   (single row)
 *   - InstantDeposit  — "Soforteinzahlung" + "Reservation iDEAL" pair
 *   - Deposit         — "Einzahlung"           (single row)
 */
export interface DepositTransaction {
  type: 'Deposit';
  /** Primary deposit row. */
  deposit: AccountBookingRow;
  /**
   * Accompanying payment reservation row (only for iDEAL / SOFORT deposits).
   */
  reservation?: AccountBookingRow;
  date: string;
}

/**
 * Annual market connectivity fee charged per exchange.
 * "Einrichtung von Handelsmodalitäten YYYY (Exchange - CODE)"
 * Single row, no Order-ID.
 */
export interface MarketAccessFeeTransaction {
  type: 'MarketAccessFee';
  row: AccountBookingRow;
  date: string;
  /** Exchange name extracted from the description, e.g. "Nasdaq - NDQ". */
  exchange: string;
  /** Fee year extracted from the description. */
  year: number;
}

/**
 * Interest posted to or charged from the account.
 * Single row, no Order-ID.
 *
 * Subtypes:
 *   - "Flatex Interest Income" → positive or zero amount
 *   - "Zinsen" / "Flatex Interest" → typically negative (charge)
 */
export interface InterestTransaction {
  type: 'Interest';
  row: AccountBookingRow;
  date: string;
}

/**
 * SOFORT payment fee ("SOFORT Zahlungsgebühr").
 * Single row, no Order-ID.
 */
export interface PaymentFeeTransaction {
  type: 'PaymentFee';
  row: AccountBookingRow;
  date: string;
}

/**
 * A daily NAV price change notification for the DEGIRO money market fund
 * ("Geldmarktfonds Preisänderung (EUR)"). Informational only — no actual
 * cash movement occurs.
 */
export interface MoneyMarketPriceChangeTransaction {
  type: 'MoneyMarketPriceChange';
  row: AccountBookingRow;
}

/**
 * An automatic buy or sell of DEGIRO money market fund units
 * ("Geldmarktfonds Umwandlung: Kauf / Verkauf").
 * No Order-ID — posted by DEGIRO's cash management system.
 */
export interface MoneyMarketConversionTransaction {
  type: 'MoneyMarketConversion';
  side: 'Buy' | 'Sell';
  row: AccountBookingRow;
  date: string;
}

/**
 * A row that could not be attributed to any known transaction type.
 */
export interface UnknownTransaction {
  type: 'Unknown';
  row: AccountBookingRow;
}

/** Discriminated union of all logical transaction types. */
export type AccountTransaction =
  | TradeTransaction
  | CorporateActionTransaction
  | StockSplitTransaction
  | DividendTransaction
  | FxConversionTransaction
  | CashSweepTransaction
  | DepositTransaction
  | MarketAccessFeeTransaction
  | InterestTransaction
  | PaymentFeeTransaction
  | MoneyMarketPriceChangeTransaction
  | MoneyMarketConversionTransaction
  | UnknownTransaction;
