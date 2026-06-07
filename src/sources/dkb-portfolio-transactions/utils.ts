/**
 * Parse a German-formatted number string to a JavaScript number.
 * German format uses '.' as thousand separator and ',' as decimal separator.
 *
 * @example
 * parseGermanNumber("1.900,00")  // => 1900
 * parseGermanNumber("50.000,00") // => 50000
 * parseGermanNumber("92,25")     // => 92.25
 */
export function parseGermanNumber(value: string): number {
  const trimmed = value.trim();
  const normalized = trimmed.replace(/\.(?=\d{3})/g, '').replace(',', '.');
  const result = parseFloat(normalized);
  if (isNaN(result)) {
    throw new Error(`Cannot parse number: "${value}"`);
  }
  return result;
}

/**
 * Convert a German date string (DD.MM.YYYY) to ISO 8601 format (YYYY-MM-DD).
 *
 * @example
 * parseGermanDate("15.03.2024") // => "2024-03-15"
 */
export function parseGermanDate(dateStr: string): string {
  const match = dateStr.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) {
    throw new Error(`Cannot parse date: "${dateStr}". Expected DD.MM.YYYY`);
  }
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

/**
 * Normalise raw PDF text: collapse runs of tabs and spaces within each line
 * to a single space and trim leading/trailing whitespace per line.
 * Newlines are preserved.
 */
export function normalizeText(raw: string): string {
  return raw
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .join('\n');
}
