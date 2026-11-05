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

// ---------------- Análisis de un suministro (cualquiera, aunque no sea significativo) ----------------
export type Nivel = 'alto' | 'bajo' | 'normal';

export interface AnalisisMes {
  month: MonthKey;
  hasReceipt: boolean;
  consumption: number;
  amount: number;
  unitCost: number | null; // S/ por kW-h o m³ (solo si hay consumo)
  varPrevAmountPct: number | null; // % del monto frente al mes anterior con recibo
  nivel: Nivel | null; // frente al promedio de consumo (o monto) de los meses con datos
}

export interface AnalisisSuministro {
  stats: SupplyMonthStats;
  utilityType: UtilityType;
  year: number;
  months: AnalisisMes[]; // enero .. mes analizado
  usaConsumo: boolean; // true si hay consumo suficiente para comparar por consumo; si no, por monto
  avgAllConsumption: number; // promedio de los meses con datos hasta el mes (incluido)
  avgAllAmount: number;
  maxMes: AnalisisMes | null;
  minMes: AnalisisMes | null;
  unitCostMes: number | null;
  unitCostPrev: number | null;
  unitCostAvg: number | null;
  prevYear: { consumption: number; amount: number } | null; // mismo mes del año anterior
  last3Avg: number | null; // promedio (consumo o monto) de los 3 últimos meses con datos, incluido el mes
  beforeLast3Avg: number | null; // promedio de los meses anteriores a esos 3
  lecturaNoEncadena: { prevMonth: MonthKey; prevCurr: number; thisPrev: number } | null;
  vsPrev: { dCons: number; pCons: number | null; dAmt: number; pAmt: number | null } | null;
  vsAvg: { dCons: number; pCons: number | null; dAmt: number; pAmt: number | null } | null;
  veredicto: 'exceso' | 'ahorro' | 'normal' | 'sin-historia';
  prevNivel: Nivel | null; // cómo fue el mes anterior frente al promedio
  avisosLlenado: { message: string; reviewed: boolean; reason?: string }[]; // de "Revisar llenado" para este suministro
}

const pctOf = (to: number, from: number) => (from > 0 ? ((to - from) / from) * 100 : null);

// Años disponibles para un servicio (el más reciente primero)
export const yearsOf = (records: SupplyRecord[], utilityType: UtilityType): number[] =>
  Array.from(new Set(records.filter(r => r.utilityType === utilityType).map(r => Number(r.year) || 0).filter(y => y > 0))).sort((a, b) => b - a);

// Último mes con recibo de un suministro (para proponerlo)
export const lastMonthWithReceipt = (record: SupplyRecord): MonthKey | null => {
  const det = buildMonthlyDetailsForForm(record);
  for (let i = 11; i >= 0; i--) if (hasReceipt(det[MONTH_KEYS[i]])) return MONTH_KEYS[i];
  return null;
};

export const monthHasReceipt = (record: SupplyRecord, month: MonthKey) => hasReceipt(buildMonthlyDetailsForForm(record)[month]);

export const analyzeSupply = (records: SupplyRecord[], record: SupplyRecord, month: MonthKey, pct = DEFAULT_PCT, minSoles = DEFAULT_MIN_SOLES): AnalisisSuministro => {
  const stats = supplyMonthStats(record, month);
  const det = buildMonthlyDetailsForForm(record);
  const idx = MONTH_KEYS.indexOf(month);
  const year = Number(record.year) || new Date().getFullYear();

  const conDatos = stats.series.filter(s => s.hasReceipt);
  const conConsumo = conDatos.filter(s => s.consumption > 0);
  // Se compara por consumo si al menos 3 meses tienen consumo (y el mes analizado también); si no, por monto.
  const usaConsumo = conConsumo.length >= 3 && stats.consumption > 0;
  const base = usaConsumo ? conConsumo : conDatos;
  const val = (s: { consumption: number; amount: number }) => (usaConsumo ? s.consumption : s.amount);
  const avgAll = base.length ? base.reduce((a, s) => a + val(s), 0) / base.length : 0;
  const avgAllC = base.length ? base.reduce((a, s) => a + s.consumption, 0) / base.length : 0;
  const avgAllA = base.length ? base.reduce((a, s) => a + s.amount, 0) / base.length : 0;

  const nivelDe = (s: { consumption: number; amount: number; hasReceipt: boolean }): Nivel | null => {
    if (!s.hasReceipt || avgAll <= 0) return null;
    if (usaConsumo && s.consumption <= 0) return null;
    const p = ((val(s) - avgAll) / avgAll) * 100;
    return p >= pct ? 'alto' : p <= -pct ? 'bajo' : 'normal';
  };

  let prevAmt: number | null = null;
  const months: AnalisisMes[] = stats.series.map(s => {
    const m: AnalisisMes = {
      month: s.month,
      hasReceipt: s.hasReceipt,
      consumption: s.consumption,
      amount: s.amount,
      unitCost: s.consumption > 0 && s.amount > 0 ? s.amount / s.consumption : null,
      varPrevAmountPct: s.hasReceipt && prevAmt !== null ? pctOf(s.amount, prevAmt) : null,
      nivel: nivelDe(s)
    };
    if (s.hasReceipt) prevAmt = s.amount;
    return m;
  });

  const comparables = months.filter(m => m.hasReceipt && (!usaConsumo || m.consumption > 0));
  const maxMes = comparables.length ? comparables.reduce((a, b) => (val(b) > val(a) ? b : a)) : null;
  const minMes = comparables.length ? comparables.reduce((a, b) => (val(b) < val(a) ? b : a)) : null;

  // Costo por unidad
  const unitCostMes = stats.consumption > 0 && stats.amount > 0 ? stats.amount / stats.consumption : null;
  const unitCostPrev = stats.prevConsumption > 0 && stats.prevAmount > 0 ? stats.prevAmount / stats.prevConsumption : null;
  const antConsumo = stats.series.slice(0, idx).filter(s => s.hasReceipt && s.consumption > 0 && s.amount > 0);
  const sumA = antConsumo.reduce((a, s) => a + s.amount, 0);
  const sumC = antConsumo.reduce((a, s) => a + s.consumption, 0);
  const unitCostAvg = sumC > 0 ? sumA / sumC : null;

  // Mismo mes del año anterior (si existe el suministro registrado en ese año)
  const prevRec = records.find(
    r => r.utilityType === record.utilityType && String(r.supplyNumber).trim() === String(record.supplyNumber).trim() && Number(r.year) === year - 1
  );
  let prevYear: AnalisisSuministro['prevYear'] = null;
  if (prevRec) {
    const pd = buildMonthlyDetailsForForm(prevRec)[month];
    if (hasReceipt(pd)) prevYear = { consumption: Number(pd.consumption) || 0, amount: Number(pd.amount) || 0 };
  }

  // Tendencia: 3 últimos meses con datos frente a los anteriores
  let last3Avg: number | null = null;
  let beforeLast3Avg: number | null = null;
  if (comparables.length >= 5) {
    const l3 = comparables.slice(-3);
    const rest = comparables.slice(0, -3);
    last3Avg = l3.reduce((a, m) => a + val(m), 0) / 3;
    beforeLast3Avg = rest.reduce((a, m) => a + val(m), 0) / rest.length;
  }

  // ¿La lectura anterior del mes coincide con la lectura actual del mes anterior?
  let lecturaNoEncadena: AnalisisSuministro['lecturaNoEncadena'] = null;
  if (stats.prevMonth) {
    const pc = Number(det[stats.prevMonth].currentReading) || 0;
    const tp = Number(det[month].previousReading) || 0;
    if (pc > 0 && tp > 0 && Math.abs(pc - tp) > 0.001) lecturaNoEncadena = { prevMonth: stats.prevMonth, prevCurr: pc, thisPrev: tp };
  }

  const vsPrev = stats.prevMonth
    ? {
        dCons: stats.consumption - stats.prevConsumption,
        pCons: pctOf(stats.consumption, stats.prevConsumption),
        dAmt: stats.amount - stats.prevAmount,
        pAmt: pctOf(stats.amount, stats.prevAmount)
      }
    : null;
  const vsAvg =
    stats.monthsInAvg > 0
      ? {
          dCons: stats.consumption - stats.avgConsumption,
          pCons: pctOf(stats.consumption, stats.avgConsumption),
          dAmt: stats.amount - stats.avgAmount,
          pAmt: pctOf(stats.amount, stats.avgAmount)
        }
      : null;

  // Mismo criterio que los memorandos (monto frente al promedio de los meses anteriores)
  let veredicto: AnalisisSuministro['veredicto'] = 'sin-historia';
  if (stats.monthsInAvg >= 2 && stats.avgAmount > 0 && vsAvg) {
    const p = Math.abs(vsAvg.pAmt || 0);
    const s = Math.abs(vsAvg.dAmt);
    veredicto = p >= pct && s >= minSoles ? (vsAvg.dAmt > 0 ? 'exceso' : 'ahorro') : 'normal';
  }
  const prevMes = stats.prevMonth ? months.find(m => m.month === stats.prevMonth) || null : null;
  const rep = findFillingIssues(records, record.utilityType).find(x => x.record.id === record.id);
  const avisosLlenado = rep
    ? [
        ...rep.issues.map(i => ({ message: i.message, reviewed: false })),
        ...rep.reviewed.map(i => ({ message: i.message, reviewed: true, reason: i.reviewed?.reason }))
      ]
    : [];

  return {
    stats,
    utilityType: record.utilityType,
    year,
    months,
    usaConsumo,
    avgAllConsumption: avgAllC,
    avgAllAmount: avgAllA,
    maxMes,
    minMes,
    unitCostMes,
    unitCostPrev,
    unitCostAvg,
    prevYear,
    last3Avg,
    beforeLast3Avg,
    lecturaNoEncadena,
    vsPrev,
    vsAvg,
    veredicto,
    prevNivel: prevMes ? prevMes.nivel : null,
    avisosLlenado
  };
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
