// lib/exportSchedule.ts
// Export shift schedule to Excel (.xlsx) or PDF

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface Employee {
  id: number;
  full_name: string;
  department?: string;
}

interface ShiftEntry {
  id: number;
  user_id: number;
  date: string;
  shift_type: string;
  notes?: string;
}

const SHIFT_ABBREV: Record<string, string> = {
  morning: 'ב',
  afternoon: 'צ',
  night: 'ל',
  duty: 'כ',
  day_off: '',
};

const SHIFT_LABEL: Record<string, string> = {
  morning: 'בוקר',
  afternoon: 'צהריים',
  night: 'לילה',
  duty: 'כוננות',
  day_off: 'חופש',
};

function padDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
}

export function exportToExcel(
  employees: Employee[],
  schedule: ShiftEntry[],
  year: number,
  month: number
) {
  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Header row
  const header = ['עובד', 'מחלקה', ...days.map((d) => String(d))];

  // Build shift map
  const shiftMap: Record<string, Record<string, string>> = {};
  for (const entry of schedule) {
    if (!shiftMap[entry.user_id]) shiftMap[entry.user_id] = {};
    shiftMap[entry.user_id][entry.date] = SHIFT_ABBREV[entry.shift_type] ?? '';
  }

  const rows = employees.map((emp) => {
    const row: (string | number)[] = [emp.full_name, emp.department ?? ''];
    for (const d of days) {
      const dateStr = padDate(year, month, d);
      row.push(shiftMap[emp.id]?.[dateStr] ?? '');
    }
    return row;
  });

  const wsData = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [{ wch: 22 }, { wch: 14 }, ...days.map(() => ({ wch: 4 }))];

  // RTL direction
  if (!ws['!opts']) ws['!opts'] = {};

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, monthLabel(year, month));

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `לוח-משמרות-${year}-${String(month).padStart(2, '0')}.xlsx`);
}

export async function exportToPDF(
  employees: Employee[],
  schedule: ShiftEntry[],
  year: number,
  month: number
) {
  // Dynamic import to avoid SSR issues
  const jsPDF = (await import('jspdf')).default;
  const autoTable = (await import('jspdf-autotable')).default;

  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });

  // Title
  doc.setFontSize(14);
  doc.text(`Schedule - ${monthLabel(year, month)}`, 14, 14);
  doc.setFontSize(9);

  const shiftMap: Record<string, Record<string, string>> = {};
  for (const entry of schedule) {
    if (!shiftMap[entry.user_id]) shiftMap[entry.user_id] = {};
    shiftMap[entry.user_id][entry.date] = SHIFT_ABBREV[entry.shift_type] ?? '';
  }

  const head = [['Employee', 'Dept', ...days.map((d) => String(d))]];
  const body = employees.map((emp) => {
    const row: string[] = [emp.full_name, emp.department ?? ''];
    for (const d of days) {
      const dateStr = padDate(year, month, d);
      row.push(shiftMap[emp.id]?.[dateStr] ?? '');
    }
    return row;
  });

  // Legend
  const legend = Object.entries(SHIFT_LABEL)
    .filter(([k]) => k !== 'day_off')
    .map(([k, v]) => `${SHIFT_ABBREV[k]}=${v}`)
    .join('  ');

  autoTable(doc, {
    head,
    body,
    startY: 20,
    styles: { fontSize: 7, cellPadding: 1.5, halign: 'center' },
    columnStyles: {
      0: { halign: 'left', cellWidth: 32, fontSize: 8 },
      1: { halign: 'left', cellWidth: 20 },
    },
    headStyles: { fillColor: [30, 41, 82], textColor: 255, fontSize: 7 },
    alternateRowStyles: { fillColor: [240, 242, 250] },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? 20;
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text(`Legend: ${legend}`, 14, finalY + 6);

  doc.save(`shift-schedule-${year}-${String(month).padStart(2, '0')}.pdf`);
}
