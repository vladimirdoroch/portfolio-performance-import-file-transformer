/**
 * Integration tests for the comdirect securities account PDF parser.
 *
 * These tests read real comdirect "Wertpapier-Abrechnung" PDF files from the
 * `examples/` folder and verify end-to-end that parsing + CSV generation
 * produces correct output.
 *
 * --- How to add a test case ---
 * 1. Copy a comdirect trade confirmation PDF into
 *    `test/securities_account/comdirect/examples/`
 * 2. Optionally place a JSON expectations file with the same base name
 *    (e.g. `buy_nvidia.pdf` → `buy_nvidia.expected.json`) to assert specific
 *    field values.
 *
 * Expected JSON schema (all fields optional):
 * {
 *   "type":           "buy" | "sell",
 *   "securityName":  string,
 *   "isin":          string,
 *   "wkn":           string,
 *   "shares":        number,
 *   "totalValue":    number,
 *   "currency":      string,
 *   "tradeDate":     "YYYY-MM-DD",
 *   "settlementDate":"YYYY-MM-DD"
 * }
 *
 * Without an expectations file only structural validation is performed:
 *   - `shares` > 0
 *   - `totalValue` > 0
 *   - at least one of `isin`, `wkn`, or `securityName` is present
 *   - `tradeDate` matches YYYY-MM-DD
 *   - generated CSV has a header row and exactly one data row
 *   - CSV header contains Date, Type, Shares, Value
 *   - CSV Type value is either "Buy" or "Sell"
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePdfFile } from '../../../src/sources/comdirect-securities-account/pdf-reader.js';
import { toPortfolioTransactionRow } from '../../../src/sources/comdirect-securities-account/transformer.js';
import { generateCsv } from '../../../src/sources/comdirect-securities-account/csv-generator.js';
import type { ComdirectTransaction } from '../../../src/sources/comdirect-securities-account/types.js';

// ---------------------------------------------------------------------------
// Expectations type (all fields optional)
// ---------------------------------------------------------------------------

interface Expectations {
  type?: 'buy' | 'sell';
  securityName?: string;
  isin?: string;
  wkn?: string;
  shares?: number;
  totalValue?: number;
  currency?: string;
  tradeDate?: string;
  settlementDate?: string;
}

// ---------------------------------------------------------------------------
// Discover PDF files
// ---------------------------------------------------------------------------

const EXAMPLES_DIR = join(fileURLToPath(import.meta.url), '..', 'examples');

const pdfFiles = existsSync(EXAMPLES_DIR)
  ? readdirSync(EXAMPLES_DIR).filter((f) => extname(f).toLowerCase() === '.pdf')
  : [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadExpectations(pdfFilename: string): Expectations | null {
  const base = basename(pdfFilename, extname(pdfFilename));
  const expectPath = join(EXAMPLES_DIR, `${base}.expected.json`);
  if (!existsSync(expectPath)) {
    return null;
  }
  return JSON.parse(readFileSync(expectPath, 'utf-8')) as Expectations;
}

function assertStructure(transaction: ComdirectTransaction): void {
  expect(transaction.shares).toBeGreaterThan(0);
  expect(transaction.totalValue).toBeGreaterThan(0);
  expect(
    transaction.isin ?? transaction.wkn ?? transaction.securityName,
    'At least one of isin, wkn, or securityName must be present',
  ).toBeTruthy();
  expect(transaction.tradeDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  if (transaction.settlementDate !== undefined) {
    expect(transaction.settlementDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }
}

function assertExpectations(transaction: ComdirectTransaction, exp: Expectations): void {
  if (exp.type !== undefined) {
    expect(transaction.type).toBe(exp.type);
  }
  if (exp.securityName !== undefined) {
    expect(transaction.securityName).toBe(exp.securityName);
  }
  if (exp.isin !== undefined) {
    expect(transaction.isin).toBe(exp.isin);
  }
  if (exp.wkn !== undefined) {
    expect(transaction.wkn).toBe(exp.wkn);
  }
  if (exp.shares !== undefined) {
    expect(transaction.shares).toBe(exp.shares);
  }
  if (exp.totalValue !== undefined) {
    expect(transaction.totalValue).toBe(exp.totalValue);
  }
  if (exp.currency !== undefined) {
    expect(transaction.currency).toBe(exp.currency);
  }
  if (exp.tradeDate !== undefined) {
    expect(transaction.tradeDate).toBe(exp.tradeDate);
  }
  if (exp.settlementDate !== undefined) {
    expect(transaction.settlementDate).toBe(exp.settlementDate);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe.skipIf(pdfFiles.length === 0)(
  'PDF integration – examples/ folder',
  () => {
    for (const filename of pdfFiles) {
      const filePath = join(EXAMPLES_DIR, filename);
      const expectations = loadExpectations(filename);

      describe(filename, () => {
        it('is recognised as a comdirect trade confirmation', async () => {
          const transaction = await parsePdfFile(filePath);
          expect(transaction).not.toBeNull();
        });

        it('passes structural validation', async () => {
          const transaction = await parsePdfFile(filePath);
          expect(transaction).not.toBeNull();
          assertStructure(transaction!);
        });

        if (expectations !== null) {
          it('matches the expected field values', async () => {
            const transaction = await parsePdfFile(filePath);
            expect(transaction).not.toBeNull();
            assertExpectations(transaction!, expectations);
          });
        }

        it('generates a valid Portfolio Performance CSV', async () => {
          const transaction = await parsePdfFile(filePath);
          expect(transaction).not.toBeNull();

          const row = toPortfolioTransactionRow(transaction!);
          const csv = generateCsv([row], 'en');
          const lines = csv.split('\n');

          expect(lines.length).toBeGreaterThanOrEqual(2);
          expect(lines[0]).toContain('Date');
          expect(lines[0]).toContain('Type');
          expect(lines[0]).toContain('Shares');
          expect(lines[0]).toContain('Value');

          const headers = lines[0]!.split(';');
          const dataFields = (lines[1] ?? '').split(';');
          const sharesIdx = headers.indexOf('Shares');
          const valueIdx = headers.indexOf('Value');
          const typeIdx = headers.indexOf('Type');

          expect(Number(dataFields[sharesIdx])).toBeGreaterThan(0);
          expect(Number(dataFields[valueIdx])).toBeGreaterThan(0);
          expect(['Buy', 'Sell']).toContain(dataFields[typeIdx]);
        });

        it('generates German CSV with translated type values', async () => {
          const transaction = await parsePdfFile(filePath);
          expect(transaction).not.toBeNull();

          const row = toPortfolioTransactionRow(transaction!);
          const csv = generateCsv([row]);
          const lines = csv.split('\n');

          expect(lines.length).toBeGreaterThanOrEqual(2);
          expect(lines[0]).toContain('Typ');

          const headers = lines[0]!.split(';');
          const dataFields = (lines[1] ?? '').split(';');
          const typeIdx = headers.indexOf('Typ');

          expect(['Kauf', 'Verkauf']).toContain(dataFields[typeIdx]);
        });
      });
    }
  },
);
