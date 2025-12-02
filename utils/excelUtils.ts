import * as XLSX from 'xlsx';
import { QRDataField } from '../types';

export const exportToExcel = (dataList: QRDataField[][], fileName: string = 'danh_sach_cccd') => {
  if (dataList.length === 0) return;

  // Flatten data: Map each array of fields to a single object
  const rows = dataList.map(fields => {
    return fields.reduce((acc, curr) => {
      acc[curr.label] = curr.value;
      return acc;
    }, {} as Record<string, string>);
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  
  // Auto-width for columns
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    const wscols = headers.map(key => ({ wch: Math.max(key.length, 25) }));
    worksheet['!cols'] = wscols;
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dữ liệu QR");

  XLSX.writeFile(workbook, `${fileName}_${new Date().getTime()}.xlsx`);
};