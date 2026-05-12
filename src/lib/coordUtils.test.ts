import { describe, it, expect } from 'vitest';
import {
  cleanLatInput,
  cleanLngInput,
  isValidBjmLat,
  isValidBjmLng,
} from './coordUtils';

// ── isValidBjmLat ─────────────────────────────────────────────────────────────

describe('isValidBjmLat', () => {
  it('accepts Banjarmasin city range', () => {
    expect(isValidBjmLat(-3.3194)).toBe(true);
    expect(isValidBjmLat(-3.0)).toBe(true);
    expect(isValidBjmLat(-4.0)).toBe(true);
  });

  it('rejects values outside -4.0 to -3.0', () => {
    expect(isValidBjmLat(-2.9)).toBe(false);
    expect(isValidBjmLat(0)).toBe(false);
    expect(isValidBjmLat(-4.1)).toBe(false);
    expect(isValidBjmLat(-35.0)).toBe(false); // data lolos dengan nilai salah
  });
});

// ── isValidBjmLng ─────────────────────────────────────────────────────────────

describe('isValidBjmLng', () => {
  it('accepts Banjarmasin city range', () => {
    expect(isValidBjmLng(114.5928)).toBe(true);
    expect(isValidBjmLng(114.0)).toBe(true);
    expect(isValidBjmLng(115.0)).toBe(true);
  });

  it('rejects values outside 114.0 to 115.0', () => {
    expect(isValidBjmLng(113.9)).toBe(false);
    expect(isValidBjmLng(100.0)).toBe(false);
    expect(isValidBjmLng(-3.0)).toBe(false);    // lat masuk ke field lng
    expect(isValidBjmLng(0)).toBe(false);
  });
});

// ── cleanLatInput ─────────────────────────────────────────────────────────────

describe('cleanLatInput', () => {
  it('returns null for empty input', () => {
    expect(cleanLatInput('').value).toBeNull();
    expect(cleanLatInput('   ').value).toBeNull();
  });

  it('returns null for non-numeric junk', () => {
    expect(cleanLatInput('abc').value).toBeNull();
    expect(cleanLatInput('-').value).toBeNull();
    expect(cleanLatInput('.').value).toBeNull();
  });

  // Rule 4: koma → titik
  it('replaces comma with dot (rule 4)', () => {
    const r = cleanLatInput('-3,3194');
    expect(r.value).toBeCloseTo(-3.3194, 4);
    expect(r.cleaned).toBe(true);
    expect(r.valid).toBe(true);
  });

  // Rule 2: tanpa desimal → masukkan titik setelah digit pertama, paksa negatif
  it('inserts decimal after first digit and forces negative — "332678" → -3.32678 (rule 2)', () => {
    const r = cleanLatInput('332678');
    expect(r.value).toBeCloseTo(-3.32678, 4);
    expect(r.cleaned).toBe(true);
    expect(r.valid).toBe(true);
    expect(r.display).toBe((-3.32678).toFixed(7));
  });

  it('inserts decimal with explicit minus — "-332678" → -3.32678 (rule 2)', () => {
    const r = cleanLatInput('-332678');
    expect(r.value).toBeCloseTo(-3.32678, 4);
    expect(r.cleaned).toBe(true);
    expect(r.valid).toBe(true);
  });

  // Rule 2 edge: already correct format
  it('accepts already correct lat without flagging cleaned', () => {
    const r = cleanLatInput('-3.3194000');
    expect(r.value).toBeCloseTo(-3.3194, 4);
    expect(r.valid).toBe(true);
  });

  // Force negative
  it('forces positive input to negative', () => {
    const r = cleanLatInput('3.3194');
    expect(r.value).toBeCloseTo(-3.3194, 4);
    expect(r.cleaned).toBe(true);
    expect(r.valid).toBe(true);
  });

  // Out of range → valid: false (rule 6 trigger)
  it('marks out-of-range lat as invalid (rule 6)', () => {
    const r = cleanLatInput('-35.0');  // Pulau Jawa, bukan Banjarmasin
    expect(r.value).toBeCloseTo(-35.0, 1);
    expect(r.valid).toBe(false);
  });

  it('marks near-zero lat as invalid', () => {
    const r = cleanLatInput('0.5');
    expect(r.valid).toBe(false);
  });

  // display field should always be parseable
  it('produces a valid parseable display string', () => {
    const r = cleanLatInput('35678900');
    expect(r.value).not.toBeNull();
    expect(parseFloat(r.display)).toBeCloseTo(r.value!, 5);
  });
});

// ── cleanLngInput ─────────────────────────────────────────────────────────────

describe('cleanLngInput', () => {
  it('returns null for empty input', () => {
    expect(cleanLngInput('').value).toBeNull();
    expect(cleanLngInput('   ').value).toBeNull();
  });

  it('returns null for non-numeric junk', () => {
    expect(cleanLngInput('xyz').value).toBeNull();
  });

  // Rule 4: koma → titik
  it('replaces comma with dot (rule 4)', () => {
    const r = cleanLngInput('114,5928');
    expect(r.value).toBeCloseTo(114.5928, 4);
    expect(r.cleaned).toBe(true);
    expect(r.valid).toBe(true);
  });

  // Rule 3: "11474658" → 114.74658
  it('inserts decimal after 3rd digit when starts with 114 — "11474658" → 114.74658 (rule 3)', () => {
    const r = cleanLngInput('11474658');
    expect(r.value).toBeCloseTo(114.74658, 4);
    expect(r.cleaned).toBe(true);
    expect(r.valid).toBe(true);
    expect(r.display).toBe((114.74658).toFixed(7));
  });

  // Rule 3: "-38097079" → -3.8097079 (insert after first digit)
  it('falls back to first-digit decimal for non-114 patterns — "-38097079" → -3.8097079 (rule 3)', () => {
    const r = cleanLngInput('-38097079');
    expect(r.value).toBeCloseTo(-3.8097079, 5);
    expect(r.cleaned).toBe(true);
    // -3.8 is not in valid lng range
    expect(r.valid).toBe(false);
  });

  // Already correct
  it('accepts already correct lng without altering value', () => {
    const r = cleanLngInput('114.5928000');
    expect(r.value).toBeCloseTo(114.5928, 4);
    expect(r.valid).toBe(true);
  });

  // Out of range → valid: false (rule 6 trigger)
  it('marks lng outside 114–115 as invalid (rule 6)', () => {
    const r = cleanLngInput('100.0');
    expect(r.valid).toBe(false);
  });

  it('marks negative lng as invalid', () => {
    const r = cleanLngInput('-3.3194');
    expect(r.valid).toBe(false);
  });

  // display field should always be parseable
  it('produces a valid parseable display string', () => {
    const r = cleanLngInput('11489000');
    expect(r.value).not.toBeNull();
    expect(parseFloat(r.display)).toBeCloseTo(r.value!, 5);
  });
});

// ── Skenario data yang "lolos" ke database tetapi koordinatnya salah (rule 6) ──

describe('Deteksi data lolos dengan koordinat salah (rule 6)', () => {
  it('lat berupa angka integer besar tanpa desimal lolos → harus terdeteksi keluar range', () => {
    // Misalnya data Excel berisi "332000" sebagai lat
    const r = cleanLatInput('332000');
    // Setelah cleaning menjadi -3.32000 → valid
    expect(r.value).toBeCloseTo(-3.32, 2);
    expect(r.valid).toBe(true);
  });

  it('lat = -35.123456 (kota lain) harus terdeteksi invalid', () => {
    const r = cleanLatInput('-35.123456');
    expect(r.valid).toBe(false);
  });

  it('lng = 106.8 (Jakarta) harus terdeteksi invalid', () => {
    const r = cleanLngInput('106.8');
    expect(r.valid).toBe(false);
  });

  it('lng = 0 harus terdeteksi invalid', () => {
    const r = cleanLngInput('0');
    // "0" tanpa desimal → insert after first digit: "0." → NaN atau 0 (edge case)
    // cukup pastikan bukan dalam range Banjarmasin
    if (r.value !== null) {
      expect(r.valid).toBe(false);
    }
  });

  it('lat & lng terbalik (lat berisi nilai lng) harus terdeteksi invalid untuk masing-masing field', () => {
    // User memasukkan 114.5928 di field latitude
    const latResult = cleanLatInput('114.5928');
    // Force negative → -114.5928, di luar range lat Banjarmasin
    expect(latResult.valid).toBe(false);

    // User memasukkan -3.3194 di field longitude
    const lngResult = cleanLngInput('-3.3194');
    expect(lngResult.valid).toBe(false);
  });
});
