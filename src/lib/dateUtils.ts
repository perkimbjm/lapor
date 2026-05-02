/**
 * Safely parses a date field from Firestore which could be a Timestamp, ISO string, or number.
 * Accepts `unknown` so callers don't need to narrow first; the function is fully defensive.
 */
export const parseFirestoreDate = (dateField: unknown): Date | null => {
  if (!dateField) return null;

  // If it's a Firestore Timestamp (has toDate method)
  if (typeof (dateField as { toDate?: unknown }).toDate === 'function') {
    return (dateField as { toDate: () => Date }).toDate();
  }

  // If it's a Firestore Timestamp-like object { seconds, nanoseconds }
  if (typeof (dateField as { seconds?: number }).seconds === 'number') {
    return new Date((dateField as { seconds: number }).seconds * 1000);
  }

  // If it's a string (ISO or other)
  if (typeof dateField === 'string') {
    // Date-only strings (YYYY-MM-DD) are treated as UTC midnight by the spec,
    // which can shift to the previous day in UTC+ timezones for getDate() comparisons.
    // Append T12:00:00 to anchor to local noon instead.
    const s = dateField.trim();
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s);
    const d = new Date(isDateOnly ? `${s}T12:00:00` : s);
    return isNaN(d.getTime()) ? null : d;
  }

  // If it's a number (timestamp in ms)
  if (typeof dateField === 'number') {
    return new Date(dateField);
  }

  // If it's already a Date object
  if (dateField instanceof Date) {
    return isNaN(dateField.getTime()) ? null : dateField;
  }

  return null;
};

/**
 * Formats a date to a readable string in Indonesian locale.
 */
export const formatIndonesianDate = (date: unknown, includeTime: boolean = false): string => {
  const d = parseFirestoreDate(date);
  if (!d) return 'Tanggal tidak valid';

  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
  });
};
