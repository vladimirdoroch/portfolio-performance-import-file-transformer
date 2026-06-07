import { readFile } from 'fs/promises';
import { PDFParse } from 'pdf-parse';
import type { ComdirectTransaction } from './types.js';
import { parseComdirectText } from './text-parser.js';

/**
 * Read a PDF file from disk, extract its text and parse it as a comdirect
 * "Wertpapier-Abrechnung" trade confirmation.
 *
 * @param filePath - Path to the PDF file.
 * @returns Parsed {@link ComdirectTransaction}, or `null` when the PDF is not
 *          a recognised comdirect trade confirmation.
 * @throws {Error} when the file cannot be read or the PDF text cannot be
 *         parsed despite matching the expected document type.
 */
export async function parsePdfFile(filePath: string): Promise<ComdirectTransaction | null> {
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: buffer });
  const { text } = await parser.getText();
  return parseComdirectText(text);
}
