import { SupplyRecord, UtilityType } from './types';
import { MONTH_KEYS, MonthKey, buildMonthlyDetailsForForm, findFillingIssues } from './recordUtils';

// ============================================================
// Cálculos de los REPORTES de InfraDash
// (memorandos de reconocimiento / advertencia e informe general)
// ============================================================

export const MES_NOMBRE: Record<MonthKey, string> = {
  ene: 'enero', feb: 'febrero', mar: 'marzo', abr: 'abril', may: 'mayo', jun: 'junio',
  jul: 'julio', ago: 'agosto', set: 'setiembre', oct: 'octubre', nov: 'noviembre', dic: 'diciembre'
};
export const MES_TITULO: Record<MonthKey, string> = {
  ene: 'Enero', feb: 'Febrero', mar: 'Marzo', abr: 'Abril', may: 'Mayo', jun: 'Junio',
  jul: 'Julio', ago: 'Agosto', set: 'Setiembre', oct: 'Octubre', nov: 'Noviembre', dic: 'Diciembre'
};

export const unitOf = (u: UtilityType) => (u === 'energy' ? 'kW-h' : 'm³');
export const serviceOf = (u: UtilityType) => (u === 'energy' ? 'energía eléctrica' : 'agua potable');
export const serviceTitle = (u: UtilityType) => (u === 'energy' ? 'Energía Eléctrica' : 'Agua Potable');

// Un mes "tiene recibo" si tiene monto, consumo o N° de recibo
const hasReceipt = (d: { amount: number; consumption: number; receipt: string }) =>
  (Number(d.amount) || 0) > 0 || (Number(d.consumption) || 0) > 0 || String(d.receipt || '').trim() !== '';

export interface SupplyMonthStats {
  record: SupplyRecord;
  month: MonthKey;
  monthIdx: number;
  receipt: string;
  prevReading: number;
  currReading: number;
  consumption: number;
  amount: number;
  prevMonth: MonthKey | null; // mes anterior con recibo
  prevConsumption: number;
  prevAmount: number;
  avgConsumption: number; // promedio de los meses anteriores con consumo (o con recibo)
  avgAmount: number;
  monthsInAvg: number;
  series: { month: MonthKey; consumption: number; amount: number; hasReceipt: boolean }[]; // ene..mes
}

export const supplyMonthStats = (record: SupplyRecord, month: MonthKey): SupplyMonthStats => {
  const det = buildMonthlyDetailsForForm(record);
  const idx = MONTH_KEYS.indexOf(month);
  const series = MONTH_KEYS.slice(0, idx + 1).map(m => ({
    month: m,
    consumption: Number(det[m].consumption) || 0,
    amount: Number(det[m].amount) || 0,
    hasReceipt: hasReceipt(det[m])
  }));
  const withReceipt = series.slice(0, idx).filter(s => s.hasReceipt);
  // El promedio usa los meses con consumo (> 0); los meses que solo pagaron cargo fijo
  // (sin consumo) no se cuentan, para no bajar el promedio artificialmente.
  const withCons = withReceipt.filter(s => s.consumption > 0);
  const before = withCons.length >= 2 ? withCons : withReceipt;
  const prev = withReceipt.length ? withReceipt[withReceipt.length - 1] : null;
  const avgC = before.length ? before.reduce((a, s) => a + s.consumption, 0) / before.length : 0;
  const avgA = before.length ? before.reduce((a, s) => a + s.amount, 0) / before.length : 0;
  const d = det[month];
  return {
    record,
    month,
    monthIdx: idx,
    receipt: String(d.receipt || ''),
    prevReading: Number(d.previousReading) || 0,
    currReading: Number(d.currentReading) || 0,
    consumption: Number(d.consumption) || 0,
    amount: Number(d.amount) || 0,
    prevMonth: prev ? prev.month : null,
    prevConsumption: prev ? prev.consumption : 0,
    prevAmount: prev ? prev.amount : 0,
    avgConsumption: avgC,
    avgAmount: avgA,
    monthsInAvg: before.length,
    series
  };
};

export type CandidateKind = 'ahorro' | 'exceso';
export interface Candidate {
  kind: CandidateKind;
  stats: SupplyMonthStats;
  diffAmount: number; // S/ (positivo = ahorro o exceso, según kind)
  pctAmount: number; // % frente al promedio
  diffConsumption: number;
}

// Criterio de "significativo": variación del monto frente al promedio de los meses
// anteriores ≥ pct (%) Y ≥ minSoles (S/). Se exigen al menos 2 meses anteriores con recibo.
export const DEFAULT_PCT = 25;
export const DEFAULT_MIN_SOLES = 100;

export const findCandidates = (
  records: SupplyRecord[],
  utilityType: UtilityType,
  month: MonthKey,
  pct = DEFAULT_PCT,
  minSoles = DEFAULT_MIN_SOLES
): Candidate[] => {
  const out: Candidate[] = [];
  records
    .filter(r => r.utilityType === utilityType)
    .forEach(record => {
      const st = supplyMonthStats(record, month);
      const det = buildMonthlyDetailsForForm(record);
      if (!hasReceipt(det[month]) || st.amount <= 0) return;
      if (st.monthsInAvg < 2 || st.avgAmount <= 0) return;
      const diff = st.amount - st.avgAmount;
      const p = (Math.abs(diff) / st.avgAmount) * 100;
      if (p < pct || Math.abs(diff) < minSoles) return;
      out.push({
        kind: diff < 0 ? 'ahorro' : 'exceso',
        stats: st,
        diffAmount: Math.abs(diff),
        pctAmount: p,
        diffConsumption: st.avgConsumption - st.consumption
      });
    });
  return out.sort((a, b) => b.diffAmount - a.diffAmount);
};

// Último mes con recibos para la mayoría de suministros (para proponer el mes del reporte)
export const suggestedMonth = (records: SupplyRecord[], utilityType?: UtilityType): MonthKey => {
  const counts: number[] = new Array(12).fill(0);
  records
    .filter(r => !utilityType || r.utilityType === utilityType)
    .forEach(r => {
      const det = buildMonthlyDetailsForForm(r);
      MONTH_KEYS.forEach((m, i) => {
        if (hasReceipt(det[m])) counts[i]++;
      });
    });
  const max = Math.max(...counts);
  if (max === 0) return MONTH_KEYS[new Date().getMonth()];
  // el último mes que tenga al menos la mitad de los recibos del mes más completo
  for (let i = 11; i >= 0; i--) if (counts[i] >= max * 0.5) return MONTH_KEYS[i];
  return MONTH_KEYS[0];
};

// ---------------- Informe general ----------------
export type ReportPeriod = { type: 'mensual' | 'semestral' | 'anual'; index: number }; // mes 0-11 / semestre 0-1

export const periodMonths = (p: ReportPeriod): MonthKey[] =>
  p.type === 'mensual' ? [MONTH_KEYS[p.index]] : p.type === 'semestral' ? MONTH_KEYS.slice(p.index * 6, p.index * 6 + 6) : [...MONTH_KEYS];

export const periodLabel = (p: ReportPeriod, year: number): string =>
  p.type === 'mensual'
    ? `${MES_TITULO[MONTH_KEYS[p.index]]} ${year}`
    : p.type === 'semestral'
      ? `${p.index === 0 ? 'Primer' : 'Segundo'} semestre ${year} (${p.index === 0 ? 'enero – junio' : 'julio – diciembre'})`
      : `Año ${year} (enero – diciembre)`;

// Período anterior equivalente (para comparar); null si no existe dentro del año
export const previousPeriod = (p: ReportPeriod): ReportPeriod | null =>
  p.type === 'mensual' ? (p.index > 0 ? { type: 'mensual', index: p.index - 1 } : null) : p.type === 'semestral' ? (p.index === 1 ? { type: 'semestral', index: 0 } : null) : null;

export interface SupplyPeriodRow {
  record: SupplyRecord;
  consumption: number;
  amount: number;
  receipts: number;
  prevConsumption: number;
  prevAmount: number;
}

export interface ServiceSection {
  utilityType: UtilityType;
  months: MonthKey[];
  totalAmount: number;
  totalConsumption: number;
  suppliesBilled: number;
  suppliesTotal: number;
  prevTotalAmount: number | null;
  prevTotalConsumption: number | null;
  monthly: { month: MonthKey; amount: number; consumption: number; receipts: number }[]; // del período
  yearMonthly: { month: MonthKey; amount: number; consumption: number }[]; // ene..último mes del período
  rows: SupplyPeriodRow[]; // todos los suministros con datos en el período (mayor gasto primero)
  candidates: Candidate[]; // ahorro / exceso significativos del último mes del período
  pendingReview: number; // avisos de "Revisar llenado" pendientes
  missing: SupplyRecord[]; // suministros sin recibo en el último mes del período
}

export const buildServiceSection = (records: SupplyRecord[], utilityType: UtilityType, p: ReportPeriod): ServiceSection => {
  const list = records.filter(r => r.utilityType === utilityType);
  const months = periodMonths(p);
  const prevP = previousPeriod(p);
  const prevMonths = prevP ? periodMonths(prevP) : [];
  const lastMonth = months[months.length - 1];
  const lastIdx = MONTH_KEYS.indexOf(lastMonth);

  const rows: SupplyPeriodRow[] = [];
  let totalA = 0;
  let totalC = 0;
  let prevA = 0;
  let prevC = 0;
  const monthly = months.map(m => ({ month: m, amount: 0, consumption: 0, receipts: 0 }));
  const yearMonthly = MONTH_KEYS.slice(0, lastIdx + 1).map(m => ({ month: m, amount: 0, consumption: 0 }));
  const missing: SupplyRecord[] = [];

  list.forEach(r => {
    const det = buildMonthlyDetailsForForm(r);
    let a = 0;
    let c = 0;
    let n = 0;
    months.forEach((m, i) => {
      if (hasReceipt(det[m])) {
        n++;
        monthly[i].receipts++;
      }
      a += Number(det[m].amount) || 0;
      c += Number(det[m].consumption) || 0;
      monthly[i].amount += Number(det[m].amount) || 0;
      monthly[i].consumption += Number(det[m].consumption) || 0;
    });
    let pa = 0;
    let pc = 0;
    prevMonths.forEach(m => {
      pa += Number(det[m].amount) || 0;
      pc += Number(det[m].consumption) || 0;
    });
    yearMonthly.forEach(y => {
      y.amount += Number(det[y.month].amount) || 0;
      y.consumption += Number(det[y.month].consumption) || 0;
    });
    totalA += a;
    totalC += c;
    prevA += pa;
    prevC += pc;
    if (n > 0) rows.push({ record: r, consumption: c, amount: a, receipts: n, prevConsumption: pc, prevAmount: pa });
    if (!hasReceipt(det[lastMonth])) {
      // solo se avisa si el suministro tenía recibos antes (está activo)
      const before = MONTH_KEYS.slice(0, lastIdx).some(m => hasReceipt(det[m]));
      if (before) missing.push(r);
    }
  });
  rows.sort((x, y) => y.amount - x.amount);
  const pendingReview = findFillingIssues(records, utilityType).reduce((acc, rep) => acc + rep.issues.length, 0);

  return {
    utilityType,
    months,
    totalAmount: totalA,
    totalConsumption: totalC,
    suppliesBilled: rows.length,
    suppliesTotal: list.length,
    prevTotalAmount: prevP ? prevA : null,
    prevTotalConsumption: prevP ? prevC : null,
    monthly,
    yearMonthly,
    rows,
    candidates: findCandidates(records, utilityType, lastMonth),
    pendingReview,
    missing
  };
};

// ---------------- Formatos ----------------
export const fmtSol = (v: number) => 'S/ ' + (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtNum = (v: number, dec = 0) => (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
export const fmtPct = (v: number) => `${(Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

export const fechaLarga = (d = new Date()) => {
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `Talara, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
};

// ---------------- Áreas (Circular de Organización N° GCAD-0419-2026) ----------------
export const AREAS_SUGERIDAS: string[] = [
  'Gerencia Operaciones Talara',
  'Jefatura PMRT y Gestión',
  'Coordinación Ingeniería',
  'Coordinación Construcción',
  'Coordinación Pruebas y Arranque',
  'Coordinación Calidad',
  'Coordinación Gestión',
  'Coordinación Contratos',
  'Coordinación Presupuesto e Indicadores',
  'Coordinación Gestión Contractual',
  'Jefatura Control Administrativo y Riesgos',
  'Jefatura Técnica',
  'Coordinación Ingeniería de Control y Aplicaciones Avanzadas',
  'Unidad Ingeniería de Procesos y Proyectos',
  'Coordinación Procesos',
  'Coordinación Proyectos',
  'Unidad Laboratorio',
  'Coordinación Gestión de Laboratorio',
  'Coordinación Pruebas Diurno',
  'Unidad Ingeniería de Mantenimiento',
  'Coordinación Confiabilidad',
  'Coordinación Estrategias de Mantenimiento',
  'Coordinación Integridad Mecánica',
  'Coordinación Optimización, Monitoreo y Control',
  'Jefatura Mantenimiento',
  'Unidad Planeamiento y Paradas de Planta',
  'Coordinación Paradas de Planta',
  'Unidad Facilidades de Mantenimiento',
  'Coordinación de Mantenimiento No Industrial',
  'Jefatura QHSE Talara',
  'Jefatura de Recursos Humanos Talara',
  'Jefatura Técnica y Contrataciones Talara',
  'Coordinación Servicios TIC Talara',
  'Unidad Planta Piura',
  'Unidad Planta Talara y Aeropuerto'
];

// Área recordada por suministro (en este navegador)
const AREA_KEY = 'infradash_area_memorando';
const keyOf = (r: SupplyRecord) => `${r.utilityType}|${String(r.supplyNumber).trim()}`;
export const getSavedArea = (r: SupplyRecord): string => {
  try {
    const all = JSON.parse(localStorage.getItem(AREA_KEY) || '{}');
    return all[keyOf(r)] || '';
  } catch {
    return '';
  }
};
export const saveArea = (recs: SupplyRecord[], area: string) => {
  try {
    const all = JSON.parse(localStorage.getItem(AREA_KEY) || '{}');
    recs.forEach(r => (all[keyOf(r)] = area));
    localStorage.setItem(AREA_KEY, JSON.stringify(all));
  } catch {
    /* sin almacenamiento */
  }
};
