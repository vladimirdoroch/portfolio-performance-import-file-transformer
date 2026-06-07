import { readFile } from 'fs/promises';
import { PDFParse } from 'pdf-parse';
import type { DkbDarlehenStatement } from './types.js';
import { parseDkbDarlehenText } from './text-parser.js';

/**
 * Read a DKB Darlehen annual statement PDF from disk, extract its text and
 * parse it into a {@link DkbDarlehenStatement}.
 *
 * @param filePath - Path to the PDF file.
 * @returns Parsed {@link DkbDarlehenStatement}, or `null` when the PDF is not
 *          a recognised DKB Darlehen statement.
 * @throws {Error} when the file cannot be read or a recognised statement
 *         cannot be fully parsed.
 */
export async function parsePdfFile(filePath: string): Promise<DkbDarlehenStatement | null> {
  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: buffer });
  const { text } = await parser.getText();
  return parseDkbDarlehenText(text);
}
