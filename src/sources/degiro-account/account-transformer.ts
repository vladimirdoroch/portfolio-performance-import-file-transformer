import type {
  AccountTransaction,
  CorporateActionTransaction,
  DepositTransaction,
  DividendTransaction,
  FxConversionPair,
  InterestTransaction,
  MarketAccessFeeTransaction,
  PaymentFeeTransaction,
  TradeTransaction,
} from './types.js';
import type { AccountTransactionRow } from '../../pp/types.js';
import { parseTradeFillDescription } from './utils.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function optStr(s: string | undefined): string | undefined {
  return s !== undefined && s !== '' ? s : undefined;
}

/**
 * Return the EUR amount (always positive) from an FX conversion pair.
 * The EUR row is identified by `changeCurrency === 'EUR'`.
 */
function eurAmountFromPair(pair: FxConversionPair): number {
  const eurRow =
    pair.debit.changeCurrency === 'EUR' ? pair.debit
    : pair.credit.changeCurrency === 'EUR' ? pair.credit
    : undefined;

  if (eurRow !== undefined) return Math.abs(eurRow.changeAmount ?? 0);

  // Fallback: derive EUR amount from FX rate
  const fxRow = pair.debit.fxRate !== undefined ? pair.debit : pair.credit;
  return fxRow.fxRate !== undefined
    ? Math.abs(fxRow.changeAmount ?? 0) / fxRow.fxRate
    : 0;
}

/**
 * Return the PP exchange rate (EUR per foreign unit = 1 / DeGiro fxRate)
 * from an FX conversion pair.
 */
function ppRateFromPair(pair: FxConversionPair): number | undefined {
  const fxRow = pair.debit.fxRate !== undefined ? pair.debit : pair.credit;
  return fxRow.fxRate !== undefined ? 1 / fxRow.fxRate : undefined;
}

// ─── Trade ───────────────────────────────────────────────────────────────────

/**
 * Convert a Trade transaction to an AccountTransactionRow.
 *
 * - EUR trades: `value` = gross settlement value; `fees` = brokerage fee.
 * - Cross-currency trades: `value` = EUR debited/credited (from FX pairs);
 *   `grossAmount` + `currencyGrossAmount` + `exchangeRate` carry the local
 *   currency detail.
 */
function tradeToRow(tx: TradeTransaction): AccountTransactionRow | undefined {
  const { side, fills, fillDetails, fxConversions, fee, date, isin, product } = tx;

  const totalShares = fillDetails.reduce((s, d) => s + d.shares, 0);
  if (totalShares === 0) return undefined;

  const time = fills[0]?.time;
  const type = side === 'Buy' ? 'Buy' as const : 'Sell' as const;
  const securityName = optStr(product);
  const feeAmount = fee !== undefined ? Math.abs(fee.changeAmount ?? 0) : undefined;

  if (fxConversions.length === 0) {
    // EUR-denominated trade
    const grossValue = fillDetails.reduce((s, d) => s + d.value, 0);
    return {
      date,
      type,
      value: grossValue,
      transactionCurrency: 'EUR',
      shares: totalShares,
      isin,
      ...(securityName !== undefined && { securityName }),
      ...(time !== undefined && { time }),
      ...(feeAmount !== undefined && feeAmount > 0 && { fees: feeAmount }),
      ...(tx.orderId && { note: tx.orderId }),
    };
  }

  // Cross-currency trade: sum EUR from FX conversion pairs
  let totalEurValue = 0;
  let rate: number | undefined;
  for (const pair of fxConversions) {
    totalEurValue += eurAmountFromPair(pair);
    if (rate === undefined) rate = ppRateFromPair(pair);
  }

  const grossValue = fillDetails.reduce((s, d) => s + d.value, 0);
  const securityCurrency = fillDetails[0]?.currency ?? 'EUR';

  return {
    date,
    type,
    value: totalEurValue,
    transactionCurrency: 'EUR',
    grossAmount: grossValue,
    currencyGrossAmount: securityCurrency,
    ...(rate !== undefined && { exchangeRate: rate }),
    shares: totalShares,
    isin,
    ...(securityName !== undefined && { securityName }),
    ...(time !== undefined && { time }),
    ...(feeAmount !== undefined && feeAmount > 0 && { fees: feeAmount }),
    ...(tx.orderId && { note: tx.orderId }),
  };
}

// ─── Dividend ─────────────────────────────────────────────────────────────────

/**
 * Convert a Dividend transaction to an AccountTransactionRow.
 *
 * The row consolidates all dividend, tax, and ADR-fee sub-rows:
 *   - `value`  = net gross dividend (sum of dividend rows, always positive)
 *   - `taxes`  = abs(net withholding tax), omitted when zero
 *   - `fees`   = abs(net ADR/GDR fee), omitted when zero
 *
 * Returns `undefined` when the net dividend amount is ≤ 0 (fully reversed).
 */
function dividendToRow(tx: DividendTransaction): AccountTransactionRow | undefined {
  const netGross = tx.dividends.reduce((s, r) => s + (r.changeAmount ?? 0), 0);
  if (netGross <= 0) return undefined;

  const netTax = tx.taxes.reduce((s, r) => s + (r.changeAmount ?? 0), 0);
  const netAdrFee = tx.adrFees.reduce((s, r) => s + (r.changeAmount ?? 0), 0);

  const foreignCurrency = tx.dividends[0]?.changeCurrency ?? 'EUR';
  const securityName = optStr(tx.product);

  if (tx.fxConversion !== undefined) {
    // The grouper matched a standalone FX conversion whose debit equals the
    // net foreign amount. Use the real exchange rate from that pair so the
    // dividend row is expressed in EUR with the gross, taxes, and rate filled.
    const ppRate = ppRateFromPair(tx.fxConversion); // EUR per foreign unit
    if (ppRate !== undefined) {
      // value = net EUR (what lands in the account after taxes/fees).
      // PP validates: value + taxes + fees = grossAmount * exchangeRate
      const netEur = (netGross + netTax + netAdrFee) * ppRate;
      const taxesEur = netTax < 0 ? Math.abs(netTax) * ppRate : undefined;
      const adrFeeEur = netAdrFee < 0 ? Math.abs(netAdrFee) * ppRate : undefined;
      return {
        date: tx.exDate,
        type: 'Dividend',
        value: netEur,
        transactionCurrency: 'EUR',
        grossAmount: netGross,
        currencyGrossAmount: foreignCurrency,
        exchangeRate: ppRate,
        isin: tx.isin,
        ...(securityName !== undefined && { securityName }),
        ...(taxesEur !== undefined && taxesEur > 0 && { taxes: taxesEur }),
        ...(adrFeeEur !== undefined && adrFeeEur > 0 && { fees: adrFeeEur }),
      };
    }
  }

  // Fallback: no FX conversion linked — output in the dividend's own currency.
  return {
    date: tx.exDate,
    type: 'Dividend',
    value: netGross,
    transactionCurrency: foreignCurrency,
    isin: tx.isin,
    ...(securityName !== undefined && { securityName }),
    ...(netTax < 0 && { taxes: Math.abs(netTax) }),
    ...(netAdrFee < 0 && { fees: Math.abs(netAdrFee) }),
  };
}

// ─── Corporate action ────────────────────────────────────────────────────────

/**
 * Convert a CorporateAction (FUSION / merger) to AccountTransactionRow entries.
 *
 * Each sell leg → `Sell` with value=0 (shares removed at no cash cost).
 * Each buy leg  → `Buy`  with value=0 (shares added  at no cash cost).
 * Rows with 0 shares (cash-only acquisitions) are skipped.
 */
function corporateActionActionNote(tx: CorporateActionTransaction): string | undefined {
  if (tx.orderId !== undefined) return tx.orderId;
  const firstRow = tx.sells[0] ?? tx.buys[0];
  if (firstRow === undefined) return undefined;
  const bt = firstRow.bookingType;
  if (bt === 'FusionBuy' || bt === 'FusionSell') return 'FUSION';
  if (bt === 'DelistingBuy' || bt === 'DelistingSell') return 'DELISTING';
  if (bt === 'CapitalIncreaseBuy' || bt === 'CapitalIncreaseSell') return 'KAPITALERHÖHUNG';
  return undefined;
}

function corporateActionToRows(tx: CorporateActionTransaction): AccountTransactionRow[] {
  const rows: AccountTransactionRow[] = [];
  const note = corporateActionActionNote(tx);
  // Use matched FX rate, or fall back to 1:1 so the row can always be imported in EUR.
  const ppRate = tx.fxConversion !== undefined ? (ppRateFromPair(tx.fxConversion) ?? 1) : 1;

  for (const row of tx.sells) {
    const detail = parseTradeFillDescription(row.description);
    if (!detail || detail.shares === 0) continue;
    const securityName = optStr(row.product);
    const foreignAmount = Math.abs(row.changeAmount ?? 0);
    const currency = row.changeCurrency ?? detail.currency;

    if (currency !== 'EUR' && foreignAmount > 0) {
      rows.push({
        date: row.date,
        type: 'Sell',
        value: foreignAmount * ppRate,
        transactionCurrency: 'EUR',
        grossAmount: foreignAmount,
        currencyGrossAmount: currency,
        ...(ppRate !== 1 && { exchangeRate: ppRate }),
        shares: detail.shares,
        ...(row.isin !== undefined && { isin: row.isin }),
        ...(securityName !== undefined && { securityName }),
        ...(row.time !== undefined && { time: row.time }),
        ...(note !== undefined && { note }),
      });
    } else {
      rows.push({
        date: row.date,
        type: 'Sell',
        value: foreignAmount,
        shares: detail.shares,
        transactionCurrency: 'EUR',
        ...(row.isin !== undefined && { isin: row.isin }),
        ...(securityName !== undefined && { securityName }),
        ...(row.time !== undefined && { time: row.time }),
        ...(note !== undefined && { note }),
      });
    }
  }

  for (const row of tx.buys) {
    const detail = parseTradeFillDescription(row.description);
    if (!detail || detail.shares === 0) continue;
    const securityName = optStr(row.product);
    const foreignAmount = Math.abs(row.changeAmount ?? 0);
    const currency = row.changeCurrency ?? detail.currency;

    if (currency !== 'EUR' && foreignAmount > 0) {
      rows.push({
        date: row.date,
        type: 'Buy',
        value: foreignAmount * ppRate,
        transactionCurrency: 'EUR',
        grossAmount: foreignAmount,
        currencyGrossAmount: currency,
        ...(ppRate !== 1 && { exchangeRate: ppRate }),
        shares: detail.shares,
        ...(row.isin !== undefined && { isin: row.isin }),
        ...(securityName !== undefined && { securityName }),
        ...(row.time !== undefined && { time: row.time }),
        ...(note !== undefined && { note }),
      });
    } else {
      rows.push({
        date: row.date,
        type: 'Buy',
        value: foreignAmount,
        shares: detail.shares,
        transactionCurrency: 'EUR',
        ...(row.isin !== undefined && { isin: row.isin }),
        ...(securityName !== undefined && { securityName }),
        ...(row.time !== undefined && { time: row.time }),
        ...(note !== undefined && { note }),
      });
    }
  }

  return rows;
}

// ─── Deposit ─────────────────────────────────────────────────────────────────

/**
 * Convert a Deposit transaction to an AccountTransactionRow.
 *
 * Positive `changeAmount` → Deposit; negative → Withdrawal.
 * Returns `undefined` when the amount is absent (flatex bank-entry rows).
 */
function depositToRow(tx: DepositTransaction): AccountTransactionRow | undefined {
  const amount = tx.deposit.changeAmount;
  if (amount === undefined) return undefined;

  const type = amount >= 0 ? 'Deposit' as const : 'Withdrawal' as const;
  const time = optStr(tx.deposit.time);
  const note = optStr(tx.deposit.description);

  return {
    date: tx.date,
    type,
    value: Math.abs(amount),
    transactionCurrency: tx.deposit.changeCurrency ?? 'EUR',
    ...(time !== undefined && { time }),
    ...(note !== undefined && { note }),
  };
}

// ─── Interest ─────────────────────────────────────────────────────────────────

/**
 * Convert an Interest transaction to an AccountTransactionRow.
 *
 * Positive `changeAmount` → Interest income; negative → Interest Charge.
 * Returns `undefined` when the amount is absent.
 */
function interestToRow(tx: InterestTransaction): AccountTransactionRow | undefined {
  const amount = tx.row.changeAmount;
  if (amount === undefined) return undefined;

  const type = amount >= 0 ? 'Interest' as const : 'Interest Charge' as const;
  const time = optStr(tx.row.time);

  return {
    date: tx.date,
    type,
    value: Math.abs(amount),
    transactionCurrency: tx.row.changeCurrency ?? 'EUR',
    ...(time !== undefined && { time }),
  };
}

// ─── Fees ─────────────────────────────────────────────────────────────────────

/**
 * Convert a MarketAccessFee transaction to an AccountTransactionRow.
 * The exchange name and year are included in the `note` field.
 */
function marketAccessFeeToRow(tx: MarketAccessFeeTransaction): AccountTransactionRow | undefined {
  const amount = tx.row.changeAmount;
  if (amount === undefined) return undefined;

  const time = optStr(tx.row.time);

  return {
    date: tx.date,
    type: 'Fees',
    value: Math.abs(amount),
    transactionCurrency: tx.row.changeCurrency ?? 'EUR',
    ...(time !== undefined && { time }),
    note: `${tx.exchange} (${tx.year})`,
  };
}

/**
 * Convert a PaymentFee transaction (SOFORT Zahlungsgebühr) to an
 * AccountTransactionRow.
 */
function paymentFeeToRow(tx: PaymentFeeTransaction): AccountTransactionRow | undefined {
  const amount = tx.row.changeAmount;
  if (amount === undefined) return undefined;

  const time = optStr(tx.row.time);

  return {
    date: tx.date,
    type: 'Fees',
    value: Math.abs(amount),
    transactionCurrency: tx.row.changeCurrency ?? 'EUR',
    ...(time !== undefined && { time }),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Convert an array of {@link AccountTransaction} objects into
 * {@link AccountTransactionRow} objects ready for Portfolio Performance's
 * "Account Transactions" CSV import.
 *
 * ### Mapped transaction types
 *
 * | DeGiro type        | PP type              | Notes |
 * |--------------------|----------------------|-------|
 * | `Trade` (buy)      | `Buy`                | EUR value from FX pairs for cross-currency |
 * | `Trade` (sell)     | `Sell`               | Same |
 * | `Dividend`         | `Dividend`           | taxes + ADR fees collapsed into one row |
 * | `Deposit`          | `Deposit`            | Based on positive changeAmount |
 * | `Deposit`          | `Withdrawal`         | Based on negative changeAmount |
 * | `Interest`         | `Interest`           | Flatex Interest Income |
 * | `Interest`         | `Interest Charge`    | Zinsen / negative Flatex Interest |
 * | `MarketAccessFee`  | `Fees`               | Annual exchange connectivity fee |
 * | `PaymentFee`       | `Fees`               | SOFORT payment processing fee |
 *
 * ### Omitted transaction types
 *
 * - `StockSplit` — belongs to the Portfolio Transactions import
 * - `FxConversion` — implicit in trade and dividend values
 * - `CashSweep` — internal DEGIRO ↔ flatex settlement, not a real external flow
 * - `MoneyMarketConversion` / `MoneyMarketPriceChange` — internal cash management
 * - `Unknown` — unclassified rows
 */
export function toAccountTransactionRows(transactions: AccountTransaction[]): AccountTransactionRow[] {
  const rows: AccountTransactionRow[] = [];

  for (const tx of transactions) {
    switch (tx.type) {
      case 'Trade': {
        const row = tradeToRow(tx);
        if (row !== undefined) rows.push(row);
        break;
      }
      case 'Dividend': {
        const row = dividendToRow(tx);
        if (row !== undefined) rows.push(row);
        break;
      }
      case 'Deposit': {
        const row = depositToRow(tx);
        if (row !== undefined) rows.push(row);
        break;
      }
      case 'Interest': {
        const row = interestToRow(tx);
        if (row !== undefined) rows.push(row);
        break;
      }
      case 'MarketAccessFee': {
        const row = marketAccessFeeToRow(tx);
        if (row !== undefined) rows.push(row);
        break;
      }
      case 'PaymentFee': {
        const row = paymentFeeToRow(tx);
        if (row !== undefined) rows.push(row);
        break;
      }
      case 'CorporateAction': {
        for (const row of corporateActionToRows(tx)) rows.push(row);
        break;
      }
      // StockSplit → use toPortfolioTransactionRows instead
      // FxConversion, CashSweep, MoneyMarketConversion,
      // MoneyMarketPriceChange, Unknown → omitted
    }
  }

  return rows;
}
