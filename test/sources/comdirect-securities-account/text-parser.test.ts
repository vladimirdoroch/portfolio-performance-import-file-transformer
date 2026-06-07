import { describe, it, expect } from 'vitest';
import { parseComdirectText } from '../../../src/sources/comdirect-securities-account/text-parser.js';
import {
  BUY_FULL,
  BUY_MINIMAL,
  BUY_MULTI_FEE,
  SELL_FULL,
  NON_TRADE_PDF,
  BUY_MISSING_SECURITY_NAME,
} from './fixtures.js';

describe('parseComdirectText – non-trade documents', () => {
  it('returns null for unrecognised document types', () => {
    expect(parseComdirectText(NON_TRADE_PDF)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseComdirectText('')).toBeNull();
  });
});

describe('parseComdirectText – buy confirmation (full)', () => {
  const result = parseComdirectText(BUY_FULL);

  it('returns a non-null result', () => {
    expect(result).not.toBeNull();
  });

  it('identifies the transaction as a buy', () => {
    expect(result?.type).toBe('buy');
  });

  it('extracts the security name', () => {
    expect(result?.securityName).toBe('NVIDIA Corp.');
  });

  it('extracts the ISIN', () => {
    expect(result?.isin).toBe('US67066G1040');
  });

  it('extracts the WKN', () => {
    expect(result?.wkn).toBe('918422');
  });

  it('extracts the number of shares', () => {
    expect(result?.shares).toBe(2);
  });

  it('extracts the price per share', () => {
    expect(result?.pricePerShare).toBe(950);
  });

  it('extracts the currency', () => {
    expect(result?.currency).toBe('EUR');
  });

  it('extracts the total value (Kurswert)', () => {
    expect(result?.totalValue).toBe(1900);
  });

  it('extracts the trade date in ISO format', () => {
    expect(result?.tradeDate).toBe('2024-03-15');
  });

  it('extracts the trade time', () => {
    expect(result?.tradeTime).toBe('15:30');
  });

  it('extracts the settlement date in ISO format', () => {
    expect(result?.settlementDate).toBe('2024-03-19');
  });

  it('extracts the cash account (IBAN without spaces)', () => {
    expect(result?.cashAccount).toBe('DE12345678901234567890');
  });

  it('extracts the securities account (depot number)', () => {
    expect(result?.securitiesAccount).toBe('2345678901');
  });

  it('extracts the fees (Provision)', () => {
    expect(result?.fees).toBe(12.9);
  });
});

describe('parseComdirectText – buy confirmation (minimal)', () => {
  const result = parseComdirectText(BUY_MINIMAL);

  it('returns a non-null result', () => {
    expect(result).not.toBeNull();
  });

  it('identifies the transaction as a buy', () => {
    expect(result?.type).toBe('buy');
  });

  it('extracts the security name', () => {
    expect(result?.securityName).toBe('BASF SE');
  });

  it('extracts the ISIN', () => {
    expect(result?.isin).toBe('DE000BASF111');
  });

  it('extracts the WKN', () => {
    expect(result?.wkn).toBe('BASF11');
  });

  it('extracts shares as integer', () => {
    expect(result?.shares).toBe(20);
  });

  it('extracts price per share', () => {
    expect(result?.pricePerShare).toBe(45);
  });

  it('extracts total value', () => {
    expect(result?.totalValue).toBe(900);
  });

  it('extracts trade date', () => {
    expect(result?.tradeDate).toBe('2026-04-05');
  });

  it('leaves optional fields undefined when absent', () => {
    expect(result?.tradeTime).toBeUndefined();
    expect(result?.settlementDate).toBeUndefined();
    expect(result?.cashAccount).toBeUndefined();
    expect(result?.fees).toBeUndefined();
  });
});

describe('parseComdirectText – sell confirmation', () => {
  const result = parseComdirectText(SELL_FULL);

  it('returns a non-null result', () => {
    expect(result).not.toBeNull();
  });

  it('identifies the transaction as a sell', () => {
    expect(result?.type).toBe('sell');
  });

  it('extracts shares correctly', () => {
    expect(result?.shares).toBe(2);
  });

  it('extracts trade date', () => {
    expect(result?.tradeDate).toBe('2024-04-10');
  });

  it('extracts settlement date', () => {
    expect(result?.settlementDate).toBe('2024-04-12');
  });

  it('extracts the fees (Provision)', () => {
    expect(result?.fees).toBe(12.9);
  });
});

describe('parseComdirectText – buy confirmation (multiple fees)', () => {
  const result = parseComdirectText(BUY_MULTI_FEE);

  it('returns a non-null result', () => {
    expect(result).not.toBeNull();
  });

  it('sums all fee lines (Provision + Transaktionsentgelt)', () => {
    expect(result?.fees).toBe(13.85);
  });
});

describe('parseComdirectText – error cases', () => {
  it('throws when the security name cannot be found', () => {
    expect(() => parseComdirectText(BUY_MISSING_SECURITY_NAME)).toThrow(
      'Could not extract security name',
    );
  });
});
