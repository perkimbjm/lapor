
/**
 * Safely parses a date field from Firestore which could be a Timestamp, ISO string, or number.
 */
export const parseFirestoreDate = (dateField: any): Date | null => {
  if (!dateField) return null;
  
  // If it's a Firestore Timestamp (has toDate method)
  if (dateField && typeof dateField.toDate === 'function') {
    return dateField.toDate();
  }
  
  // If it's a Firestore Timestamp-like object { seconds, nanoseconds }
  if (dateField && typeof dateField.seconds === 'number') {
    return new Date(dateField.seconds * 1000);
  }
  
  // If it's a string (ISO or other)
  if (typeof dateField === 'string') {
    const d = new Date(dateField);
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
export const formatIndonesianDate = (date: Date | string | any, includeTime: boolean = false): string => {
  const d = parseFirestoreDate(date);
  if (!d) return 'Tanggal tidak valid';
  
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
  });
};
