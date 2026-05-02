import * as XLSX from 'xlsx';

/**
 * Export data to an Excel file.
 * @param data - The array of objects to export.
 * @param fileName - The name of the file (without extension).
 * @param sheetName - The name of the sheet.
 */
export const exportToExcel = <T extends Record<string, unknown>>(data: T[], fileName: string, sheetName: string = 'Sheet1') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
