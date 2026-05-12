// Coordinate cleaning & validation utilities for Banjarmasin area
// Banjarmasin: lat ≈ -3.xxxx, lng ≈ 114.xxxx

export const BJM_LAT_MIN = -4.0;
export const BJM_LAT_MAX = -3.0;
export const BJM_LNG_MIN = 114.0;
export const BJM_LNG_MAX = 115.0;

export function isValidBjmLat(v: number): boolean {
  return v >= BJM_LAT_MIN && v <= BJM_LAT_MAX;
}

export function isValidBjmLng(v: number): boolean {
  return v >= BJM_LNG_MIN && v <= BJM_LNG_MAX;
}

export interface CoordCleanResult {
  value: number | null;
  display: string;   // formatted string to show in the input after cleaning
  cleaned: boolean;  // true if input was auto-transformed
  valid: boolean;    // true if result is within Banjarmasin bounds
}

/**
 * Clean and normalize a latitude input.
 * Rules:
 *  - Replace comma → dot
 *  - If no decimal point: insert after first digit and force negative ("-3.xxxxx")
 *  - Always force negative sign
 */
export function cleanLatInput(raw: string): CoordCleanResult {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, display: '', cleaned: false, valid: false };

  const original = trimmed;
  // Replace comma with dot
  let s = original.replace(/,/g, '.');
  // Remove all characters except digits, minus, and dot
  s = s.replace(/[^0-9.\-]/g, '');

  if (!s || s === '-' || s === '.') return { value: null, display: original, cleaned: false, valid: false };

  let value: number | null = null;
  let cleaned = false;

  if (s.includes('.')) {
    const parsed = parseFloat(s);
    if (isNaN(parsed)) return { value: null, display: original, cleaned: false, valid: false };
    // Force negative
    value = -Math.abs(parsed);
    cleaned = value.toFixed(7) !== parseFloat(original).toFixed(7);
  } else {
    // No decimal — insert after first digit, force negative
    // "332678" → "-3.32678"
    const digits = s.replace(/[^\d]/g, '');
    if (!digits) return { value: null, display: original, cleaned: false, valid: false };
    const parsed = parseFloat(`-${digits[0]}.${digits.slice(1)}`);
    value = isNaN(parsed) ? null : parsed;
    cleaned = true;
  }

  if (value === null) return { value: null, display: original, cleaned: false, valid: false };

  const display = value.toFixed(7);
  return { value, display, cleaned, valid: isValidBjmLat(value) };
}

/**
 * Clean and normalize a longitude input.
 * Rules:
 *  - Replace comma → dot
 *  - If digits start with "114": insert decimal after 3rd digit ("11474658" → "114.74658")
 *  - Otherwise: insert after first digit (same pattern as lat)
 */
export function cleanLngInput(raw: string): CoordCleanResult {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, display: '', cleaned: false, valid: false };

  const original = trimmed;
  let s = original.replace(/,/g, '.');
  s = s.replace(/[^0-9.\-]/g, '');

  if (!s || s === '-' || s === '.') return { value: null, display: original, cleaned: false, valid: false };

  let value: number | null = null;
  let cleaned = false;

  if (s.includes('.')) {
    const parsed = parseFloat(s);
    if (isNaN(parsed)) return { value: null, display: original, cleaned: false, valid: false };
    value = parsed;
    cleaned = value.toFixed(7) !== parseFloat(original).toFixed(7);
  } else {
    const negative = s.startsWith('-');
    const digits = s.replace(/[^\d]/g, '');
    if (!digits) return { value: null, display: original, cleaned: false, valid: false };

    if (digits.startsWith('114')) {
      // "11474658" → "114.74658"
      const parsed = parseFloat(`114.${digits.slice(3)}`);
      value = isNaN(parsed) ? null : parsed;
    } else {
      // "-38097079" → "-3.8097079" (insert after first digit)
      const sign = negative ? '-' : '';
      const parsed = parseFloat(`${sign}${digits[0]}.${digits.slice(1)}`);
      value = isNaN(parsed) ? null : parsed;
    }
    cleaned = true;
  }

  if (value === null) return { value: null, display: original, cleaned: false, valid: false };

  const display = value.toFixed(7);
  return { value, display, cleaned, valid: isValidBjmLng(value) };
}
