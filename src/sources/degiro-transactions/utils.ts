/**
 * Parse a German-formatted number string to a JavaScript number.
 * German format uses '.' as a thousands separator and ',' as the decimal separator.
 *
 * @example
 * parseGermanNumber("12.150,08")  // => 12150.08
 * parseGermanNumber("1,1614")     // => 1.1614
 * parseGermanNumber("-26,15")     // => -26.15
 * parseGermanNumber("0,00")       // => 0
 */
export function parseGermanNumber(value: string): number {
  const trimmed = value.trim();
  // Remove thousands separators (a period followed by exactly 3 digits) then swap decimal comma
  const normalized = trimmed.replace(/\.(?=\d{3})/g, '').replace(',', '.');
  const result = parseFloat(normalized);
  if (isNaN(result)) {
    throw new Error(`Cannot parse number: "${value}"`);
  }
  return result;
}

/**
 * Convert a DeGiro date string (DD-MM-YYYY) to ISO 8601 format (YYYY-MM-DD).
 *
 * @example
 * parseDegiroDate("22-05-2026") // => "2026-05-22"
 * parseDegiroDate("06-04-2026") // => "2026-04-06"
 */
export function parseDegiroDate(dateStr: string): string {
  const match = dateStr.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) {
    throw new Error(`Cannot parse date: "${dateStr}". Expected DD-MM-YYYY`);
  }
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

/**
 * Parse RFC 4180-compliant CSV text into a two-dimensional array of strings.
 *
 * Handles:
 * - Fields quoted with double-quotes (including fields that contain commas)
 * - Escaped double-quotes inside quoted fields (`""` → `"`)
 * - Both CRLF and LF line endings
 *
 * Empty trailing fields on a line (e.g. `a,b,`) are included as empty strings.
 * Completely blank lines are returned as `['']`.
 *
 * @param text - Raw CSV file content.
 * @returns A 2-D array where the outer array is rows and the inner array is fields.
 */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  // Normalise line endings to LF
  const input = text.replace(/\r\n?/g, '\n');
  let i = 0;

  while (i < input.length) {
    const row: string[] = [];

    // Parse fields until we hit a newline or the end of input
    while (i < input.length && input[i] !== '\n') {
      if (input[i] === '"') {
        // Quoted field
        let field = '';
        i++; // skip opening quote
        while (i < input.length) {
          if (input[i] === '"' && input[i + 1] === '"') {
            // Escaped double-quote
            field += '"';
            i += 2;
          } else if (input[i] === '"') {
            i++; // skip closing quote
            break;
          } else {
            field += input[i++];
          }
        }
        row.push(field);
        if (i < input.length && input[i] === ',') i++; // skip field delimiter
      } else {
        // Unquoted field
        let field = '';
        while (i < input.length && input[i] !== ',' && input[i] !== '\n') {
          field += input[i++];
        }
        row.push(field);
        if (i < input.length && input[i] === ',') i++; // skip field delimiter
      }
    }

    if (i < input.length && input[i] === '\n') i++; // skip newline
    rows.push(row);
  }

  return rows;
}
