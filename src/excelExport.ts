// Exportación a Excel REAL (.xlsx) con exceljs.
// Antes se descargaba un .csv separado por ";" que, según la configuración regional de Windows,
// Excel abría con todo en una sola columna. Ahora se descarga un libro de Excel con formato.
// La librería se carga solo al exportar (import dinámico), para no hacer más lenta la carga inicial.

export type ColKind = 'text' | 'center' | 'number' | 'soles';

export interface ExcelColumn {
  header: string;
  kind: ColKind;
  width: number;
}

export interface ExcelSheetSpec {
  fileName: string; // sin extensión
  sheetName: string;
  title: string;
  subtitle?: string;
  columns: ExcelColumn[];
  rows: (string | number | null)[][];
  // Fila de totales: por cada columna, 'sum' = suma con fórmula, texto fijo o null
  totals?: ('sum' | string | null)[];
  accent?: string; // color del encabezado (ARGB sin #), ej. '1F4E79'
}

const FONT = 'Arial';

const colLetter = (n: number) => {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

export const downloadExcel = async (spec: ExcelSheetSpec) => {
  const mod: any = await import('exceljs');
  const ExcelJS = mod.default || mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'InfraDash';
  wb.created = new Date();
  const ws = wb.addWorksheet(spec.sheetName.slice(0, 31).replace(/[\\/?*[\]:]/g, '-'), {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 }
  });
  const accent = 'FF' + (spec.accent || '1F4E79');
  const nCols = spec.columns.length;
  const thin = { style: 'thin', color: { argb: 'FFBFBFBF' } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  // Título y subtítulo
  ws.getCell('A1').value = spec.title;
  ws.getCell('A1').font = { name: FONT, size: 12, bold: true };
  ws.getCell('A2').value = spec.subtitle || `Generado por InfraDash el ${new Date().toLocaleDateString('es-PE')}`;
  ws.getCell('A2').font = { name: FONT, size: 10, italic: true, color: { argb: 'FF595959' } };

  // Encabezados (fila 4)
  spec.columns.forEach((c, i) => {
    const cell = ws.getCell(4, i + 1);
    cell.value = c.header;
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accent } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = border;
    ws.getColumn(i + 1).width = c.width;
  });
  ws.getRow(4).height = 30;

  // Datos
  const first = 5;
  spec.rows.forEach((row, r) => {
    row.forEach((v, i) => {
      const col = spec.columns[i];
      const cell = ws.getCell(first + r, i + 1);
      cell.value = v === null || v === undefined ? null : v;
      cell.font = { name: FONT, size: 10 };
      cell.border = border;
      if (col.kind === 'number') cell.numFmt = '#,##0.00';
      if (col.kind === 'soles') cell.numFmt = '"S/ "#,##0.00';
      cell.alignment =
        col.kind === 'center'
          ? { horizontal: 'center', vertical: 'middle' }
          : col.kind === 'text'
            ? { vertical: 'middle', wrapText: true }
            : { horizontal: 'right', vertical: 'middle' };
    });
  });
  const last = first + spec.rows.length - 1;

  // Totales con fórmula (se recalculan si el usuario cambia un valor)
  if (spec.totals && spec.rows.length > 0) {
    const tr = last + 1;
    spec.totals.forEach((t, i) => {
      const cell = ws.getCell(tr, i + 1);
      const col = spec.columns[i];
      if (t === 'sum') {
        const L = colLetter(i + 1);
        let result = 0;
        spec.rows.forEach(row => {
          const n = Number(row[i]);
          if (!isNaN(n)) result += n;
        });
        cell.value = { formula: `SUM(${L}${first}:${L}${last})`, result: Math.round(result * 100) / 100 };
        cell.numFmt = col.kind === 'soles' ? '"S/ "#,##0.00' : '#,##0.00';
        cell.alignment = { horizontal: 'right' };
      } else cell.value = t;
      cell.font = { name: FONT, size: 10, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } };
      cell.border = border;
    });
  }
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(last, 4), column: nCols } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${spec.fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};
