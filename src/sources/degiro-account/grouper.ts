import type {
  AccountBookingRow,
  AccountTransaction,
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
  TradeTransaction,
  TradeFillDetail,
  UnknownTransaction,
} from './types.js';
import { parseTradeFillDescription, parseMarketAccessFeeDescription } from './utils.js';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function makeKey(...parts: (string | undefined)[]): string {
  return parts.map((p) => p ?? '').join('|');
}

// All booking types that represent corporate-action security conversions
const CORPORATE_ACTION_TYPES = new Set([
  'FusionBuy', 'FusionSell',
  'DelistingBuy', 'DelistingSell',
  'CapitalIncreaseBuy', 'CapitalIncreaseSell',
]);

const CORPORATE_ACTION_SELL_TYPES = new Set([
  'FusionSell', 'DelistingSell', 'CapitalIncreaseSell',
]);

const CORPORATE_ACTION_BUY_TYPES = new Set([
  'FusionBuy', 'DelistingBuy', 'CapitalIncreaseBuy',
]);

/**
 * Build a {@link TradeFillDetail} from a Buy / Sell row, falling back to
 * the raw change amount when description parsing fails (e.g. round-lot only
 * descriptions without full detail).
 */
function extractFillDetail(row: AccountBookingRow): TradeFillDetail {
  const parsed = parseTradeFillDescription(row.description);
  if (parsed) {
    return {
      shares: parsed.shares,
      pricePerShare: parsed.pricePerShare,
      currency: parsed.currency,
      value: Math.abs(parsed.shares * parsed.pricePerShare),
    };
  }
  // Fallback: we can only provide the gross value from the change amount
  return {
    shares: 0,
    pricePerShare: 0,
    currency: row.changeCurrency ?? '',
    value: Math.abs(row.changeAmount ?? 0),
  };
}

// ─── Grouper ──────────────────────────────────────────────────────────────────

/**
 * Group a flat list of {@link AccountBookingRow} objects into logical
 * {@link AccountTransaction} instances.
 *
 * The input is expected to be in the same order as the CSV file (newest first).
 * Output order preserves the first-occurrence date of each transaction.
 *
 * ### Grouping strategy
 *
 * 1. **Order-ID rows** — all rows sharing an Order-ID are collected together
 *    and resolved as either a {@link TradeTransaction} or a
 *    {@link CorporateActionTransaction} (FUSION, DELISTING, KAPITALERHÖHUNG).
 *
 * 1b. **Corporate-action rows without Order-ID** — older DEGIRO exports omit
 *    the Order-ID for FUSION rows; these are grouped by `(date, time)`.
 *
 * 2. **Dividend rows** — `Dividend`, `DividendTax`, and `AdrFee` rows without
 *    an Order-ID are grouped by `(isin, valueDate)`.  Multiple booking rounds
 *    (corrections / reversals) for the same ex-date are included in one
 *    {@link DividendTransaction}; net amounts are obtained by summing
 *    `changeAmount` across the respective sub-arrays.
 *
 * 3. **AKTIENSPLIT rows** — grouped by `(isin, date)` into
 *    {@link StockSplitTransaction} pairs.  Time is intentionally excluded
 *    because DEGIRO sometimes posts the debit and credit 1-2 minutes apart.
 *
 * 4. **Standalone FX rows** — `FxDebit` / `FxCredit` pairs without an
 *    Order-ID and without an ISIN are matched by `(date, time)` into
 *    {@link FxConversionTransaction} instances.  Also handles the old DEGIRO
 *    format where both sides were labeled `Ausbuchung` (two FxDebit rows).
 *
 * 5. **Cash-sweep pairs** — each `CashSweep` row is matched to its
 *    accompanying `FlatexWithdrawal` or `FlatexTransfer` row at the same
 *    `(date, time)`.
 *
 * 6. **Deposit pairs** — `InstantDeposit` is matched to its
 *    `PaymentReservation` row at the same `(date, time)`.
 *
 * 7. **Single-row transactions** — `FlatexDeposit`, `Deposit`,
 *    `MarketAccessFee`, `InterestIncome`, `InterestCharge`, `PaymentFee`,
 *    and any `Unknown` rows are each returned as their own transaction.
 */
export function groupAccountRows(rows: AccountBookingRow[]): AccountTransaction[] {
  const transactions: AccountTransaction[] = [];
  const consumed = new Set<AccountBookingRow>();

  // ── Step 1: group by Order-ID ─────────────────────────────────────────────
  const byOrderId = new Map<string, AccountBookingRow[]>();
  for (const row of rows) {
    if (row.orderId) {
      const group = byOrderId.get(row.orderId) ?? [];
      group.push(row);
      byOrderId.set(row.orderId, group);
    }
  }

  for (const [orderId, group] of byOrderId) {
    const isFusion = group.some((r) => CORPORATE_ACTION_TYPES.has(r.bookingType));

    if (isFusion) {
      const lastRow = group[group.length - 1];
      const tx: CorporateActionTransaction = {
        type: 'CorporateAction',
        orderId,
        sells: group.filter((r) => CORPORATE_ACTION_SELL_TYPES.has(r.bookingType)),
        buys: group.filter((r) => CORPORATE_ACTION_BUY_TYPES.has(r.bookingType)),
        date: lastRow?.date ?? '',
      };
      transactions.push(tx);
    } else {
      // Regular trade — separate fills, FX pairs, and the fee row
      const fillRows = group.filter(
        (r) => r.bookingType === 'Buy' || r.bookingType === 'Sell',
      );
      const fxDebitRows = group.filter((r) => r.bookingType === 'FxDebit');
      const fxCreditRows = group.filter((r) => r.bookingType === 'FxCredit');
      const feeRow = group.find((r) => r.bookingType === 'TransactionFee');

      // Pair each FxDebit with its corresponding FxCredit at the same index.
      // DEGIRO emits them in alternating Einbuchung / Ausbuchung order for
      // multi-fill orders; we rely on the interleaved structure to pair them.
      const fxConversions: FxConversionPair[] = [];
      const len = Math.min(fxDebitRows.length, fxCreditRows.length);
      for (let i = 0; i < len; i++) {
        const debit = fxDebitRows[i];
        const credit = fxCreditRows[i];
        if (debit && credit) fxConversions.push({ debit, credit });
      }

      const firstFillRow = fillRows[0];
      const side: 'Buy' | 'Sell' = firstFillRow?.bookingType === 'Sell' ? 'Sell' : 'Buy';
      const lastFillRow = fillRows[fillRows.length - 1];
      const lastGroupRow = group[group.length - 1];
      const anchor = lastFillRow ?? lastGroupRow;

      const tx: TradeTransaction = {
        type: 'Trade',
        orderId,
        side,
        fills: fillRows,
        fillDetails: fillRows.map(extractFillDetail),
        fxConversions,
        ...(feeRow !== undefined && { fee: feeRow }),
        date: anchor?.date ?? '',
        product: anchor?.product ?? '',
        isin: anchor?.isin ?? '',
      };
      transactions.push(tx);
    }

    for (const row of group) consumed.add(row);
  }

  // ── Collect remaining (non-Order-ID) rows ─────────────────────────────────
  const remaining = rows.filter((r) => !consumed.has(r));

  // ── Step 1b: corporate actions without Order-ID (older DEGIRO exports) ────
  const noIdCorporateMap = new Map<string, AccountBookingRow[]>();
  for (const row of remaining) {
    if (!CORPORATE_ACTION_TYPES.has(row.bookingType)) continue;
    const key = makeKey(row.date, row.time);
    const group = noIdCorporateMap.get(key) ?? [];
    group.push(row);
    noIdCorporateMap.set(key, group);
    consumed.add(row);
  }
  for (const group of noIdCorporateMap.values()) {
    const first = group[0];
    if (!first) continue;
    const tx: CorporateActionTransaction = {
      type: 'CorporateAction',
      sells: group.filter((r) => CORPORATE_ACTION_SELL_TYPES.has(r.bookingType)),
      buys: group.filter((r) => CORPORATE_ACTION_BUY_TYPES.has(r.bookingType)),
      date: first.date,
    };
    transactions.push(tx);
  }

  // ── Step 2: dividend groups by (isin + valueDate) ─────────────────────────
  const dividendTypes = new Set<string>(['Dividend', 'DividendTax', 'AdrFee']);
  const dividendMap = new Map<string, AccountBookingRow[]>();

  for (const row of remaining) {
    if (!dividendTypes.has(row.bookingType)) continue;
    if (!row.isin) continue; // safety guard
    const key = makeKey(row.isin, row.valueDate);
    const group = dividendMap.get(key) ?? [];
    group.push(row);
    dividendMap.set(key, group);
    consumed.add(row);
  }

  for (const group of dividendMap.values()) {
    const first = group[0];
    if (!first) continue;
    const tx: DividendTransaction = {
      type: 'Dividend',
      isin: first.isin ?? '',
      product: first.product ?? '',
      exDate: first.valueDate,
      dividends: group.filter((r) => r.bookingType === 'Dividend'),
      taxes: group.filter((r) => r.bookingType === 'DividendTax'),
      adrFees: group.filter((r) => r.bookingType === 'AdrFee'),
    };
    transactions.push(tx);
  }

  // ── Step 3: AKTIENSPLIT pairs by (isin + date) ───────────────────────────
  // Group by (isin, date) only — DEGIRO sometimes posts debit and credit
  // 1-2 minutes apart, so matching on time is too strict.
  const splitMap = new Map<string, AccountBookingRow[]>();
  for (const row of remaining) {
    if (consumed.has(row)) continue;
    if (row.bookingType !== 'StockSplitDebit' && row.bookingType !== 'StockSplitCredit') continue;
    const key = makeKey(row.isin, row.date);
    const group = splitMap.get(key) ?? [];
    group.push(row);
    splitMap.set(key, group);
    consumed.add(row);
  }

  for (const group of splitMap.values()) {
    const debit = group.find((r) => r.bookingType === 'StockSplitDebit');
    const credit = group.find((r) => r.bookingType === 'StockSplitCredit');
    if (debit && credit) {
      const tx: StockSplitTransaction = {
        type: 'StockSplit',
        debit,
        credit,
        date: debit.date,
        product: debit.product ?? '',
        isin: debit.isin ?? '',
      };
      transactions.push(tx);
    } else {
      // Unmatched — emit as unknown
      for (const row of group) {
        const tx: UnknownTransaction = { type: 'Unknown', row };
        transactions.push(tx);
      }
    }
  }

  // ── Step 4: standalone FX pairs by (date + time) — no ISIN ───────────────
  // Newer DEGIRO format: one FxDebit (Ausbuchung) + one FxCredit (Einbuchung).
  // Older format (pre-2022): both rows are labeled Ausbuchung; the one with a
  // positive changeAmount acts as the credit side.
  const standaloneDebitMap = new Map<string, AccountBookingRow[]>();
  const standaloneCreditMap = new Map<string, AccountBookingRow>();

  for (const row of remaining) {
    if (consumed.has(row)) continue;
    if (row.isin) continue; // FX rows attached to a security are handled via Order-ID
    if (row.bookingType === 'FxDebit') {
      const key = makeKey(row.date, row.time);
      const list = standaloneDebitMap.get(key) ?? [];
      list.push(row);
      standaloneDebitMap.set(key, list);
      consumed.add(row);
    } else if (row.bookingType === 'FxCredit') {
      standaloneCreditMap.set(makeKey(row.date, row.time), row);
      consumed.add(row);
    }
  }

  for (const [key, debits] of standaloneDebitMap) {
    const credit = standaloneCreditMap.get(key);
    if (credit) {
      // Normal case: one debit + one credit
      const debit = debits[0]!;
      const tx: FxConversionTransaction = { type: 'FxConversion', debit, credit, date: debit.date };
      transactions.push(tx);
      standaloneCreditMap.delete(key);
      // Emit any extra debits at the same key as unknown
      for (let i = 1; i < debits.length; i++) transactions.push({ type: 'Unknown', row: debits[i]! });
    } else if (debits.length === 2) {
      // Old format: two FxDebit rows — positive changeAmount = pseudo-credit
      const debit  = debits.find((r) => (r.changeAmount ?? 0) <= 0) ?? debits[0]!;
      const pseudoCredit = debits.find((r) => r !== debit) ?? debits[1]!;
      const tx: FxConversionTransaction = { type: 'FxConversion', debit, credit: pseudoCredit, date: debit.date };
      transactions.push(tx);
    } else {
      for (const d of debits) transactions.push({ type: 'Unknown', row: d });
    }
  }

  // Unmatched credits
  for (const credit of standaloneCreditMap.values()) {
    transactions.push({ type: 'Unknown', row: credit });
  }

  // ── Step 5: cash-sweep pairs by (date + time) ────────────────────────────
  const sweepMap = new Map<string, AccountBookingRow>();
  const bankEntryMap = new Map<string, AccountBookingRow>();

  for (const row of remaining) {
    if (consumed.has(row)) continue;
    const key = makeKey(row.date, row.time);
    if (row.bookingType === 'CashSweep') {
      sweepMap.set(key, row);
      consumed.add(row);
    } else if (row.bookingType === 'FlatexWithdrawal' || row.bookingType === 'FlatexTransfer') {
      bankEntryMap.set(key, row);
      consumed.add(row);
    }
  }

  for (const [key, sweep] of sweepMap) {
    const bankEntry = bankEntryMap.get(key);
    if (bankEntry) {
      const tx: CashSweepTransaction = {
        type: 'CashSweep',
        sweep,
        bankEntry,
        date: sweep.date,
      };
      transactions.push(tx);
      bankEntryMap.delete(key);
    } else {
      transactions.push({ type: 'Unknown', row: sweep });
    }
  }

  // Unmatched bank entries (should not normally occur)
  for (const bankEntry of bankEntryMap.values()) {
    transactions.push({ type: 'Unknown', row: bankEntry });
  }

  // ── Step 6: deposit pairs and singles ────────────────────────────────────
  const depositMap = new Map<string, AccountBookingRow>();
  const reservationMap = new Map<string, AccountBookingRow>();

  for (const row of remaining) {
    if (consumed.has(row)) continue;
    const key = makeKey(row.date, row.time);
    if (row.bookingType === 'InstantDeposit') {
      depositMap.set(key, row);
      consumed.add(row);
    } else if (row.bookingType === 'PaymentReservation') {
      reservationMap.set(key, row);
      consumed.add(row);
    }
  }

  // Track amounts that were settled via an InstantDeposit+PaymentReservation
  // pair so we can suppress the earlier positive "pending" reservation that
  // DEGIRO books when an iDEAL payment is initiated (before confirmation).
  // Pattern:
  //   29-Jan: Reservation iDEAL +7000  ← pending, should NOT become a deposit
  //   31-Jan: Soforteinzahlung  +7000  ← settlement (paired with …)
  //   31-Jan: Reservation iDEAL −7000  ← reversal of the pending booking
  // Without this guard the +7000 pending reservation is emitted as a second
  // deposit, inflating the cash balance by the full deposit amount.
  const settledAmountCents = new Map<number, number>(); // amount_cents → count

  for (const [key, deposit] of depositMap) {
    const reservation = reservationMap.get(key);
    const tx: DepositTransaction = {
      type: 'Deposit',
      deposit,
      ...(reservation !== undefined && { reservation }),
      date: deposit.date,
    };
    transactions.push(tx);
    if (reservation) {
      reservationMap.delete(key);
      // Record the settled amount so the initial pending reservation is skipped
      const cents = Math.round(Math.abs(deposit.changeAmount ?? 0) * 100);
      settledAmountCents.set(cents, (settledAmountCents.get(cents) ?? 0) + 1);
    }
  }

  for (const reservation of reservationMap.values()) {
    const amount = reservation.changeAmount ?? 0;
    if (amount > 0) {
      // Positive unmatched reservation — check whether it was already captured
      // by a settled InstantDeposit+PaymentReservation pair above.
      const cents = Math.round(amount * 100);
      const count = settledAmountCents.get(cents) ?? 0;
      if (count > 0) {
        settledAmountCents.set(cents, count - 1);
        continue; // skip — the deposit was already emitted via the settled pair
      }
    }
    // Unmatched reservation — treat as a standalone deposit (e.g. the matching
    // InstantDeposit may lie outside the export window)
    const tx: DepositTransaction = { type: 'Deposit', deposit: reservation, date: reservation.date };
    transactions.push(tx);
  }

  // ── Step 7: single-row transactions ──────────────────────────────────────
  for (const row of remaining) {
    if (consumed.has(row)) continue;

    switch (row.bookingType) {
      case 'FlatexDeposit':
      case 'Deposit': {
        const tx: DepositTransaction = { type: 'Deposit', deposit: row, date: row.date };
        transactions.push(tx);
        break;
      }
      case 'MarketAccessFee': {
        const parsed = parseMarketAccessFeeDescription(row.description);
        const tx: MarketAccessFeeTransaction = {
          type: 'MarketAccessFee',
          row,
          date: row.date,
          exchange: parsed?.exchange ?? '',
          year: parsed?.year ?? 0,
        };
        transactions.push(tx);
        break;
      }
      case 'InterestIncome':
      case 'InterestCharge': {
        const tx: InterestTransaction = { type: 'Interest', row, date: row.date };
        transactions.push(tx);
        break;
      }
      case 'PaymentFee': {
        const tx: PaymentFeeTransaction = { type: 'PaymentFee', row, date: row.date };
        transactions.push(tx);
        break;
      }
      case 'MoneyMarketPriceChange': {
        const tx: MoneyMarketPriceChangeTransaction = { type: 'MoneyMarketPriceChange', row };
        transactions.push(tx);
        break;
      }
      case 'MoneyMarketBuy':
      case 'MoneyMarketSell': {
        const tx: MoneyMarketConversionTransaction = {
          type: 'MoneyMarketConversion',
          side: row.bookingType === 'MoneyMarketBuy' ? 'Buy' : 'Sell',
          row,
          date: row.date,
        };
        transactions.push(tx);
        break;
      }
      default: {
        const tx: UnknownTransaction = { type: 'Unknown', row };
        transactions.push(tx);
        break;
      }
    }
    consumed.add(row);
  }

  // ── Step 8: link standalone FX conversions to their dividend / corporate-action transactions ─
  // DEGIRO automatically converts foreign-currency proceeds to EUR by posting a
  // standalone FxConversion pair whose debit amount equals the net foreign cash
  // flow (dividends: gross − tax − ADR fees; corporate actions: net of all rows).
  // Linking the pair allows the account transformer to emit EUR-denominated rows.
  const fxConvTxs = transactions.filter(
    (tx): tx is FxConversionTransaction => tx.type === 'FxConversion',
  );
  const matchedFxConvs = new Set<FxConversionTransaction>();

  for (const tx of transactions) {
    if (tx.type !== 'Dividend' && tx.type !== 'CorporateAction') continue;

    let foreignCurrency: string | undefined;
    let netForeign: number;

    if (tx.type === 'Dividend') {
      foreignCurrency = tx.dividends[0]?.changeCurrency;
      if (!foreignCurrency || foreignCurrency === 'EUR') continue;
      netForeign =
        tx.dividends.reduce((s, r) => s + (r.changeAmount ?? 0), 0) +
        tx.taxes.reduce((s, r) => s + (r.changeAmount ?? 0), 0) +
        tx.adrFees.reduce((s, r) => s + (r.changeAmount ?? 0), 0);
    } else {
      // CorporateAction: net of all sell + buy rows' changeAmounts
      const allRows = [...tx.sells, ...tx.buys];
      foreignCurrency = allRows.find(
        (r) => r.changeCurrency !== undefined && r.changeCurrency !== 'EUR',
      )?.changeCurrency;
      if (!foreignCurrency || foreignCurrency === 'EUR') continue;
      netForeign = allRows.reduce((s, r) => s + (r.changeAmount ?? 0), 0);
      // If the net cash flow is zero (pure share-for-share swap), no FX conversion expected
      if (Math.abs(netForeign) < 0.001) continue;
    }

    // FX conversion must settle within [-1, +7] days of the transaction.
    // This prevents a conversion from one quarter being matched to a dividend
    // with the same net amount in a later quarter (e.g. repeating quarterly
    // dividends that happen to have the same net foreign amount).
    const txDate = new Date(tx.type === 'Dividend' ? tx.exDate : tx.date).getTime();
    for (const fxConv of fxConvTxs) {
      if (matchedFxConvs.has(fxConv)) continue;
      const debitCurrency = fxConv.debit.changeCurrency;
      const debitAmount = fxConv.debit.changeAmount ?? 0;
      const fxDate = new Date(fxConv.date).getTime();
      const daysDiff = (fxDate - txDate) / (1000 * 60 * 60 * 24);
      if (
        debitCurrency === foreignCurrency &&
        daysDiff >= -1 && daysDiff <= 7 &&
        Math.abs(Math.abs(debitAmount) - Math.abs(netForeign)) < 0.01
      ) {
        tx.fxConversion = { debit: fxConv.debit, credit: fxConv.credit };
        matchedFxConvs.add(fxConv);
        break;
      }
    }
  }

  // ── Step 8b: rate borrowing for unmatched foreign dividends ──────────────
  // When DEGIRO batches the dividend proceeds together with other foreign-
  // currency cash flows (e.g. a concurrent FUSION payout) into a single FX
  // conversion, the net debit won't equal the dividend alone and exact
  // matching fails.  In that case find the nearest standalone FX conversion
  // in the same currency within [-1, +7] days and borrow its exchange rate.
  for (const tx of transactions) {
    if (tx.type !== 'Dividend' || tx.fxConversion !== undefined) continue;
    const dividendCurrency = tx.dividends[0]?.changeCurrency;
    if (!dividendCurrency || dividendCurrency === 'EUR') continue;

    const txDate = new Date(tx.exDate).getTime();
    let bestConv: FxConversionTransaction | undefined;
    let bestAbsDiff = Infinity;

    for (const fxConv of fxConvTxs) {
      if (fxConv.debit.changeCurrency !== dividendCurrency) continue;
      const fxDate = new Date(fxConv.date).getTime();
      const absDays = Math.abs((fxDate - txDate) / (1000 * 60 * 60 * 24));
      const signedDays = (fxDate - txDate) / (1000 * 60 * 60 * 24);
      if (signedDays >= -1 && signedDays <= 7 && absDays < bestAbsDiff) {
        bestAbsDiff = absDays;
        bestConv = fxConv;
      }
    }

    if (bestConv !== undefined) {
      // Borrow the exchange rate only; the pair amounts don't correspond
      // 1-to-1 with this dividend so the FX conversion is not consumed.
      tx.fxConversion = { debit: bestConv.debit, credit: bestConv.credit };
    }
  }

  return transactions.filter((tx) => {
    if (tx.type !== 'FxConversion') return true;
    return !matchedFxConvs.has(tx);
  });
}
