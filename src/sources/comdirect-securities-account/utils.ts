/**
 * Parse a German-formatted number string to a JavaScript number.
 * German format uses '.' as thousand separator and ',' as decimal separator.
 *
 * @example
 * parseGermanNumber("1.900,00")  // => 1900
 * parseGermanNumber("950,0000")  // => 950
 * parseGermanNumber("2")         // => 2
 */
export function parseGermanNumber(value: string): number {
  const trimmed = value.trim();
  // Remove thousand separators (periods before at least 3 digits) then swap decimal comma
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
