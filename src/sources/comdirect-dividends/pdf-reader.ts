import { readFile } from 'fs/promises';
import { PDFParse } from 'pdf-parse';
import type { ComdirectDividend } from './types.js';
import { parseComdirectDividendText } from './text-parser.js';

/**
 * Read a PDF file from disk, extract its text and parse it as a comdirect
 * "Ertragsgutschrift" (dividend / income distribution) notification.
 *
 * @param filePath - Path to the PDF file.
 * @returns Parsed {@link ComdirectDividend}, or `null` when the PDF is not a
 *          recognised Ertragsgutschrift document.
 * @throws {Error} when the file cannot be read or parsing fails on a recognised document.
 */
export async function parsePdfFile(filePath: string): Promise<ComdirectDividend | null> {
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: buffer });
  const { text } = await parser.getText();
  return parseComdirectDividendText(text);
}
