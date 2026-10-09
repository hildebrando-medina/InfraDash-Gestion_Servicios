import type { jsPDF as JsPDFType } from 'jspdf';

// ============================================================
// Genera el PDF del recibo (A4) dibujado directamente con jsPDF:
// textos y gráficos nítidos, sin capturas de pantalla.
// ============================================================

export interface ReceiptPdfData {
  isEnergy: boolean;
  supplyNumber: string;
  propertyName: string;
  category: string;
  receiptNumber: string;
  monthName: string;          // "Diciembre"
  year: number;
  unitLabel: string;          // "kWh" o "m³"
  prevReading: number | null; // null = sin dato
  currReading: number | null;
  consumption: number | null;
  amount: number;
  debtMonths: number;
  monthLabels: string[];      // Ene..Dic
  monthlyConsumption: number[];
  monthlyAmounts?: number[];  // monto S/ por mes
  monthsPresent?: boolean[];  // meses con recibo registrado (aunque el consumo sea 0)
  selectedIndex: number;      // mes del recibo (0-11)
}

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const fmtNum = (v: number, dec = 2): string =>
  Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: dec });
const fmtSoles = (v: number): string =>
  `S/ ${Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shortNum = (v: number): string => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${parseFloat((v / 1000).toFixed(v >= 10000 ? 1 : 2))}k`;
  return fmtNum(Math.round(v * 10) / 10, 1);
};
const niceMax = (max: number): number => {
  if (max <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
};

export const receiptPdfFileName = (d: ReceiptPdfData): string =>
  `Recibo_${d.isEnergy ? 'Energia' : 'Agua'}_${(d.supplyNumber || 'SN').replace(/[^A-Za-z0-9-]+/g, '_')}_${d.monthName}_${d.year}.pdf`;

export function buildReceiptPdf(JsPDF: typeof JsPDFType, d: ReceiptPdfData): JsPDFType {
  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const PW = 210, M = 14, CW = PW - M * 2;
  const main: RGB = d.isEnergy ? hex('#1d4ed8') : hex('#0e7490');
  const soft: RGB = d.isEnergy ? hex('#eff6ff') : hex('#ecfeff');
  const dark: RGB = hex('#0f172a');
  const gray: RGB = hex('#64748b');
  const line: RGB = hex('#e2e8f0');
  const service = d.isEnergy ? 'Energía Eléctrica' : 'Agua Potable';
  // La fuente estándar del PDF no trae el carácter ³: se escribe m3
  const unit = d.unitLabel.replace('³', '3');

  const setText = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const label = (t: string, x: number, y: number) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); setText(gray); doc.text(t.toUpperCase(), x, y); };
  const value = (t: string, x: number, y: number, size = 10.5, color: RGB = dark) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(size); setText(color); doc.text(t, x, y); };

  // ---------- Encabezado ----------
  setFill(main); doc.rect(0, 0, PW, 30, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
  doc.text(`Recibo Detallado de ${service}`, M, 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(`Suministro N°: ${d.supplyNumber}   |   Periodo: ${d.monthName} ${d.year}`, M, 21);
  doc.setFontSize(8);
  doc.text('InfraDash - Control de Suministros y Servicios', PW - M, 21, { align: 'right' });

  let y = 38;
  // ---------- Datos del predio ----------
  setFill(hex('#f8fafc')); setDraw(line); doc.roundedRect(M, y, CW, 30, 2, 2, 'FD');
  const c2 = M + CW / 2 + 4;
  label('Predio / Sede', M + 5, y + 7); value(d.propertyName || '-', M + 5, y + 12.5, 11);
  label('Categoría / Ubicación', c2, y + 7); value(d.category || '-', c2, y + 12.5, 10);
  label('N° de medidor / suministro', M + 5, y + 20); value(d.supplyNumber || '-', M + 5, y + 25.5, 10);
  label('N° de comprobante / recibo', c2, y + 20); value(d.receiptNumber || 'S/N', c2, y + 25.5, 10, main);
  y += 37;

  // ---------- Consumo del mes ----------
  setFill(soft); setDraw(line); doc.roundedRect(M, y, CW, 34, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); setText(main);
  doc.text(`CONSUMO REGISTRADO PARA EL MES DE ${d.monthName.toUpperCase()}`, M + 5, y + 7);
  const bw = (CW - 10 - 8) / 3;
  const boxes: [string, string][] = [
    ['Lectura anterior', d.prevReading && d.prevReading > 0 ? fmtNum(d.prevReading) : '---'],
    ['Lectura actual', d.currReading && d.currReading > 0 ? fmtNum(d.currReading) : '---'],
    ['Consumo del periodo', d.consumption && d.consumption > 0 ? fmtNum(d.consumption) : '-'],
  ];
  boxes.forEach(([t, v], i) => {
    const bx = M + 5 + i * (bw + 4);
    doc.setFillColor(255, 255, 255); setDraw(i === 2 ? main : line);
    doc.roundedRect(bx, y + 11, bw, 19, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); setText(i === 2 ? main : gray);
    doc.text(t.toUpperCase(), bx + bw / 2, y + 16, { align: 'center' });
    doc.setFontSize(12); setText(dark); doc.text(v, bx + bw / 2, y + 23, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); setText(gray); doc.text(unit, bx + bw / 2, y + 27.5, { align: 'center' });
  });
  y += 41;

  // ---------- Facturación ----------
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); setText(gray);
  doc.text(`Concepto de facturación (${d.monthName}):`, M, y);
  doc.setFont('helvetica', 'bold'); setText(dark); doc.text(`Servicio de ${service}`, PW - M, y, { align: 'right' });
  y += 4;
  setFill(hex('#f8fafc')); setDraw(line); doc.roundedRect(M, y, CW, 12, 2, 2, 'FD');
  doc.setFontSize(11); setText(dark); doc.text(`Monto Total Facturado (${d.monthName}):`, M + 5, y + 7.8);
  doc.setFontSize(13); setText(main); doc.text(d.amount > 0 ? fmtSoles(d.amount) : '-', PW - M - 5, y + 7.8, { align: 'right' });
  y += 17;

  // ---------- Estado ----------
  setDraw(line); doc.setFillColor(255, 255, 255); doc.roundedRect(M, y, CW, 11, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); setText(gray); doc.text('Estado actual del recibo:', M + 5, y + 7.2);
  const pending = d.debtMonths > 0;
  const stTxt = pending ? `Pendiente de pago (${d.debtMonths} mes(es))` : 'Al día / Pagado';
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
  const stW = doc.getTextWidth(stTxt) + 8;
  setFill(pending ? hex('#fee2e2') : hex('#d1fae5'));
  doc.roundedRect(PW - M - 5 - stW, y + 2.3, stW, 6.4, 3, 3, 'F');
  setText(pending ? hex('#b91c1c') : hex('#047857'));
  doc.text(stTxt, PW - M - 5 - stW / 2, y + 7, { align: 'center' });
  y += 17;

  // ---------- Gráficos ----------
  const values = d.monthlyConsumption.map(v => Number(v) || 0);
  const amounts = (d.monthlyAmounts || []).map(v => Number(v) || 0);
  const present = values.map((v, i) => v > 0 || (amounts[i] || 0) > 0 || !!d.monthsPresent?.[i]);
  const hasAny = present.some(Boolean);
  const total = values.reduce((a, b) => a + b, 0);
  const withData = values.filter(v => v > 0).length;
  const totalSoles = amounts.reduce((a, b) => a + b, 0);
  const soles: RGB = hex('#047857');
  const shortSoles = (v: number): string =>
    v >= 10000 ? Math.round(v).toLocaleString('en-US') : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Los gráficos siempre muestran el CONSUMO; el monto S/ va escrito sobre cada mes
  const vals = values;
  const plotUnit = unit;
  const plotColor: RGB = main;
  const fmtVal = shortNum;

  const chartFrame = (title: string, top: number, h: number) => {
    setDraw(line); doc.setFillColor(255, 255, 255); doc.roundedRect(M, top, CW, h, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); setText(main); doc.text(title, M + 5, top + 7);
  };
  const plot = (top: number, h: number, kind: 'bar' | 'line') => {
    const withSoles = totalSoles > 0;
    const L = M + 18, R = PW - M - 6, T = top + (withSoles ? 20 : 16), B = top + h - 9;
    const max = niceMax(Math.max(...vals, 0));
    const slot = (R - L) / 12;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); setText(gray);
    doc.text(plotUnit, M + 4, T - 3);
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i; const yy = B - (v / max) * (B - T);
      setDraw(line); doc.setLineWidth(0.2); doc.line(L, yy, R, yy);
      setText(gray); doc.text(shortNum(v), L - 2, yy + 1, { align: 'right' });
    }
    const pts = vals.map((v, i) => ({ x: L + slot * i + slot / 2, y: B - (v / max) * (B - T), v }));
    if (withSoles) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); setText(soles);
      doc.text('S/ = monto facturado del mes', PW - M - 5, top + 7, { align: 'right' });
    }
    if (kind === 'bar') {
      const bwid = Math.min(8, slot * 0.6);
      pts.forEach((p, i) => {
        const isHi = i === d.selectedIndex;
        if (p.v > 0) {
          const col: RGB = isHi ? plotColor : [Math.round(plotColor[0] + (255 - plotColor[0]) * 0.55), Math.round(plotColor[1] + (255 - plotColor[1]) * 0.55), Math.round(plotColor[2] + (255 - plotColor[2]) * 0.55)];
          setFill(col); doc.rect(p.x - bwid / 2, p.y, bwid, Math.max(B - p.y, 0.6), 'F');
          doc.setFont('helvetica', isHi ? 'bold' : 'normal'); doc.setFontSize(6.5); setText(isHi ? dark : gray);
          doc.text(fmtVal(p.v), p.x, p.y - 1.2, { align: 'center' });
        }
        const amt = amounts[i] || 0;
        if (amt > 0) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(6); setText(soles);
          doc.text(shortSoles(amt), p.x, p.v > 0 ? p.y - 4.2 : B - 1.2, { align: 'center' });
        }
      });
    } else {
      setDraw(plotColor); doc.setLineWidth(0.7);
      // Se unen meses consecutivos CON recibo registrado (incluye consumo 0)
      for (let i = 1; i < pts.length; i++) if (present[i - 1] && present[i]) doc.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      pts.forEach((p, i) => {
        if (!present[i]) return;
        const isHi = i === d.selectedIndex;
        doc.setLineWidth(0.5); setDraw(plotColor);
        if (isHi) { setFill(plotColor); } else { doc.setFillColor(255, 255, 255); }
        doc.circle(p.x, p.y, isHi ? 1.5 : 1.0, 'FD');
        doc.setFont('helvetica', isHi ? 'bold' : 'normal'); doc.setFontSize(6.5); setText(isHi ? dark : gray);
        doc.text(fmtVal(p.v), p.x, p.y - 2.4, { align: 'center' });
        const amt = amounts[i] || 0;
        if (amt > 0) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(6); setText(soles);
          doc.text(shortSoles(amt), p.x, p.y - 5.4, { align: 'center' });
        }
      });
    }
    d.monthLabels.forEach((m, i) => {
      const isHi = i === d.selectedIndex;
      doc.setFont('helvetica', isHi ? 'bold' : 'normal'); doc.setFontSize(7); setText(isHi ? dark : gray);
      doc.text(m, L + slot * i + slot / 2, B + 5, { align: 'center' });
    });
  };

  const chartH = 58;
  const emptyMsg = 'Sin recibos registrados para este predio.';
  chartFrame(`Consumo mensual del predio (${unit}) y monto facturado (S/) - columnas`, y, chartH);
  if (hasAny) plot(y, chartH, 'bar');
  else { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); setText(gray); doc.text(emptyMsg, PW / 2, y + chartH / 2 + 2, { align: 'center' }); }
  y += chartH + 5;
  chartFrame(`Evolución del consumo (${unit}) y monto facturado (S/) - líneas`, y, chartH);
  if (hasAny) plot(y, chartH, 'line');
  else { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); setText(gray); doc.text(emptyMsg, PW / 2, y + chartH / 2 + 2, { align: 'center' }); }
  y += chartH + 5;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); setText(dark);
  doc.text(`Consumo anual registrado: ${fmtNum(total)} ${unit}   |   Promedio por mes con consumo: ${withData > 0 ? fmtNum(total / withData) : '0'} ${unit}   |   Gasto anual: ${fmtSoles(totalSoles)}`, M, y);

  // ---------- Pie ----------
  const now = new Date();
  doc.setFontSize(7.5); setText(gray);
  doc.text(`Generado el ${now.toLocaleDateString('es-PE')} ${now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} desde InfraDash`, M, 287);
  doc.text('Documento de control interno', PW - M, 287, { align: 'right' });
  return doc;
}
