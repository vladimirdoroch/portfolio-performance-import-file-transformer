import type {
  AccountTransaction,
  CorporateActionTransaction,
  FxConversionPair,
  StockSplitTransaction,
  TradeTransaction,
} from './types.js';
import type { PortfolioTransactionRow } from '../../pp/types.js';
import { parseTradeFillDescription, parseStockSplitDescription } from './utils.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Given a FX conversion pair, return the EUR amount (always positive) and
 * the exchange rate (EUR per foreign currency, i.e. the PP convention).
 *
 * DeGiro pairs:
 *   Buy  in USD: debit = EUR Ausbuchung (no fxRate), credit = USD Einbuchung (has fxRate)
 *   Sell in USD: debit = USD Ausbuchung (has fxRate), credit = EUR Einbuchung (no fxRate)
 *
 * The EUR row is identified by `changeCurrency === 'EUR'`.
 */
function extractEurAndRate(pair: FxConversionPair): { eurAmount: number; ppExchangeRate: number | undefined } {
  const eurRow = pair.debit.changeCurrency === 'EUR' ? pair.debit
    : pair.credit.changeCurrency === 'EUR' ? pair.credit
    : undefined;
  const fxRow = pair.debit.fxRate !== undefined ? pair.debit : pair.credit;

  const eurAmount = eurRow !== undefined
    ? Math.abs(eurRow.changeAmount ?? 0)
    : fxRow.fxRate !== undefined
      ? Math.abs(fxRow.changeAmount ?? 0) / fxRow.fxRate  // fallback
      : 0;

  // PP exchangeRate = EUR per foreign unit = 1 / (foreign per EUR)
  const ppExchangeRate = fxRow.fxRate !== undefined ? 1 / fxRow.fxRate : undefined;

  return { eurAmount, ppExchangeRate };
}

function optStr(s: string | undefined): string | undefined {
  return s !== undefined && s !== '' ? s : undefined;
}

// ─── Trade ───────────────────────────────────────────────────────────────────

function tradeToRow(tx: TradeTransaction): PortfolioTransactionRow | undefined {
  const { side, fills, fillDetails, fxConversions, fee, date, isin, product } = tx;

  const totalShares = fillDetails.reduce((s, d) => s + d.shares, 0);
  if (totalShares === 0) return undefined; // description parse failed

  const time = fills[0]?.time;
  const type = side === 'Buy' ? 'Buy' as const : 'Sell' as const;
  const securityCurrency = fillDetails[0]?.currency ?? 'EUR';

  const feeAmount = fee !== undefined ? Math.abs(fee.changeAmount ?? 0) : undefined;

  if (fxConversions.length === 0) {
    // EUR-denominated trade: take gross value directly from fill change amounts
    const grossValue = fillDetails.reduce((s, d) => s + d.value, 0);
    const securityName = optStr(product);
    return {
      date,
      type,
      shares: totalShares,
      value: grossValue,
      transactionCurrency: 'EUR',
      isin,
      ...(securityName !== undefined && { securityName }),
      ...(time !== undefined && { time }),
      ...(feeAmount !== undefined && feeAmount > 0 && { fees: feeAmount }),
      ...(tx.orderId && { note: tx.orderId }),
    };
  }

  // Cross-currency trade: aggregate EUR amounts and FX rate from conversion pairs
  let totalEurValue = 0;
  let ppExchangeRate: number | undefined;
  for (const pair of fxConversions) {
    const { eurAmount, ppExchangeRate: rate } = extractEurAndRate(pair);
    totalEurValue += eurAmount;
    if (ppExchangeRate === undefined) ppExchangeRate = rate;
  }

  const grossValue = fillDetails.reduce((s, d) => s + d.value, 0);
  const securityName = optStr(product);

  return {
    date,
    type,
    shares: totalShares,
    value: totalEurValue,
    transactionCurrency: 'EUR',
    grossAmount: grossValue,
    currencyGrossAmount: securityCurrency,
    ...(ppExchangeRate !== undefined && { exchangeRate: ppExchangeRate }),
    isin,
    ...(securityName !== undefined && { securityName }),
    ...(time !== undefined && { time }),
    ...(feeAmount !== undefined && feeAmount > 0 && { fees: feeAmount }),
    ...(tx.orderId && { note: tx.orderId }),
  };
}

// ─── Corporate action ─────────────────────────────────────────────────────────

function corporateActionToRows(tx: CorporateActionTransaction): PortfolioTransactionRow[] {
  const rows: PortfolioTransactionRow[] = [];

  for (const row of tx.sells) {
    const detail = parseTradeFillDescription(row.description);
    if (!detail || detail.shares === 0) continue;
    const securityName = optStr(row.product);
    rows.push({
      date: row.date,
      type: 'Delivery (Outbound)',
      shares: detail.shares,
      value: 0,
      ...(row.isin !== undefined && { isin: row.isin }),
      ...(securityName !== undefined && { securityName }),
      transactionCurrency: detail.currency,
      ...(row.time !== undefined && { time: row.time }),
      ...(tx.orderId !== undefined && { note: tx.orderId }),
    });
  }

  for (const row of tx.buys) {
    const detail = parseTradeFillDescription(row.description);
    if (!detail || detail.shares === 0) continue;
    const securityName = optStr(row.product);
    rows.push({
      date: row.date,
      type: 'Delivery (Inbound)',
      shares: detail.shares,
      value: 0,
      ...(row.isin !== undefined && { isin: row.isin }),
      ...(securityName !== undefined && { securityName }),
      transactionCurrency: detail.currency,
      ...(row.time !== undefined && { time: row.time }),
      ...(tx.orderId !== undefined && { note: tx.orderId }),
    });
  }

  return rows;
}

// ─── Stock split ──────────────────────────────────────────────────────────────

function stockSplitToRows(tx: StockSplitTransaction): PortfolioTransactionRow[] {
  const debitDetail = parseStockSplitDescription(tx.debit.description);
  const creditDetail = parseStockSplitDescription(tx.credit.description);
  if (!debitDetail || !creditDetail) return [];

  const securityName = optStr(tx.product);
  return [
    {
      date: tx.debit.date,
      type: 'Delivery (Outbound)',
      shares: debitDetail.shares,
      value: 0,
      isin: tx.isin,
      ...(securityName !== undefined && { securityName }),
      transactionCurrency: debitDetail.currency,
      ...(tx.debit.time !== undefined && { time: tx.debit.time }),
    },
    {
      date: tx.credit.date,
      type: 'Delivery (Inbound)',
      shares: creditDetail.shares,
      value: 0,
      isin: tx.isin,
      ...(securityName !== undefined && { securityName }),
      transactionCurrency: creditDetail.currency,
      ...(tx.credit.time !== undefined && { time: tx.credit.time }),
    },
  ];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Convert an array of {@link AccountTransaction} objects into
 * {@link PortfolioTransactionRow} objects ready for Portfolio Performance's
 * "Portfolio Transactions" CSV import.
 *
 * Only securities-related transactions are mapped:
 *   - Trade (Buy / Sell) — normal exchange trades
 *   - CorporateAction (FUSION / DELISTING / KAPITALERHÖHUNG) — as Delivery pairs
 *   - StockSplit — as Delivery (Outbound) + Delivery (Inbound) pairs
 *
 * Cash-only transactions (Deposit, Dividend, Interest, Fees, FX conversions,
 * cash sweeps, money-market entries) are omitted since they belong to the
 * Account Transactions import, not the Portfolio Transactions import.
 *
 * ### Cross-currency trades
 * For non-EUR securities the row is populated with:
 *   - `value`                — total EUR debited / credited (from FX conversion rows)
 *   - `grossAmount`          — gross value in the security's currency
 *   - `currencyGrossAmount`  — the security's currency (e.g. "USD")
 *   - `exchangeRate`         — EUR per foreign unit (PP convention = 1 / DeGiro fxRate)
 */
export function toPortfolioTransactionRows(
  transactions: AccountTransaction[],
): PortfolioTransactionRow[] {
  const rows: PortfolioTransactionRow[] = [];
  for (const tx of transactions) {
    switch (tx.type) {
      case 'Trade': {
        const row = tradeToRow(tx);
        if (row !== undefined) rows.push(row);
        break;
      }
      case 'CorporateAction':
        rows.push(...corporateActionToRows(tx));
        break;
      case 'StockSplit':
        rows.push(...stockSplitToRows(tx));
        break;
      // All other types are not portfolio transactions
    }
  }
  return rows;
}
