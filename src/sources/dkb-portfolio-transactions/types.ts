/** Known transaction description types found in DKB Darlehen statements. */
export type DkbDarlehenEntryType =
  | 'Darlehensauszahlung'   // Initial loan disbursement
  | 'Darlehensleistung'     // Regular loan repayment (old format)
  | 'Darlehenszins'         // Regular loan interest charge
  | 'Dauerauftrag'          // Standing order payment (new format)
  | 'Sondertilgung'         // Special/extra repayment
  | 'Verzugszins'           // Late-payment interest (Vorj. and lfd. Jahr)
  | 'Storno'                // Reversal of a preceding entry
  | 'sonstige Lastschrift'  // Other direct debit
  | 'Überweisung'           // Manual transfer
  | 'other';                // Unrecognised description

/** PDF layout variant of a DKB Darlehen annual statement. */
export type DkbStatementFormat = 'old' | 'new';

/** A single bookkeeping entry parsed from a DKB Darlehen account statement. */
export interface DkbDarlehenEntry {
  /** Booking date in YYYY-MM-DD format. */
  bookingDate: string;
  /**
   * Value / settlement date in YYYY-MM-DD format.
   * May differ from bookingDate (e.g. interest booked a day before its value date).
   */
  valueDate: string;
  /** Raw description text as it appears in the PDF. */
  description: string;
  /** Inferred transaction type derived from the description. */
  type: DkbDarlehenEntryType;
  /**
   * Amount in EUR.
   * Positive  = credit to the loan account (reduces outstanding debt).
   * Negative  = debit  to the loan account (increases outstanding debt, e.g. interest charges).
   */
  amount: number;
}

/** Full parsed DKB Darlehen (loan) annual account statement. */
export interface DkbDarlehenStatement {
  /** Loan account number, e.g. `"6705506597"`. */
  accountNumber: string;
  /** IBAN of the loan account without spaces, e.g. `"DE29120300006705506597"`. */
  iban: string;
  /** Statement period start in YYYY-MM-DD format. */
  periodStart: string;
  /** Statement period end in YYYY-MM-DD format. */
  periodEnd: string;
  /** Opening balance in EUR (typically negative = outstanding loan). */
  openingBalance: number;
  /** Closing balance in EUR (typically negative = outstanding loan). */
  closingBalance: number;
  /** All entries extracted from the statement, including Storno and interest entries. */
  entries: DkbDarlehenEntry[];
  /** Detected PDF layout variant. */
  format: DkbStatementFormat;
}
