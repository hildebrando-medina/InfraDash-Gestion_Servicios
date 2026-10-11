import { SupplyRecord, UtilityType } from './types';

// ============================================================
// Utilidades compartidas de InfraDash
// Una sola fuente de verdad para leer montos, consumos y recibos
// de cada mes, sin inventar valores de relleno.
// ============================================================

export const MONTH_KEYS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'] as const;
export type MonthKey = typeof MONTH_KEYS[number];

export const MONTH_LABELS: Record<MonthKey, string> = {
  ene: 'Ene', feb: 'Feb', mar: 'Mar', abr: 'Abr', may: 'May', jun: 'Jun',
  jul: 'Jul', ago: 'Ago', set: 'Set', oct: 'Oct', nov: 'Nov', dic: 'Dic'
};

export const MONTH_FULL_NAMES: Record<MonthKey, string> = {
  ene: 'Enero', feb: 'Febrero', mar: 'Marzo', abr: 'Abril', may: 'Mayo', jun: 'Junio',
  jul: 'Julio', ago: 'Agosto', set: 'Septiembre', oct: 'Octubre', nov: 'Noviembre', dic: 'Diciembre'
};

export interface MonthDetail {
  receipt: string;
  previousReading: number;
  currentReading: number;
  consumption: number;
  amount: number;
}

export const emptyMonthDetail = (): MonthDetail => ({
  receipt: '',
  previousReading: 0,
  currentReading: 0,
  consumption: 0,
  amount: 0
});

export const isMonthKey = (value: unknown): value is MonthKey =>
  typeof value === 'string' && (MONTH_KEYS as readonly string[]).includes(value);

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// ¿El registro guarda el detalle mes a mes (formato actual)?
export const hasMonthlyDetails = (record: SupplyRecord): boolean =>
  !!record.monthlyDetails && typeof record.monthlyDetails === 'object';

// Monto facturado (S/) de un mes.
// Formato actual: monthlyDetails[mes].amount
// Formato antiguo (sin monthlyDetails): months[mes] guardaba soles.
export const getMonthAmount = (record: SupplyRecord, month: MonthKey): number => {
  if (hasMonthlyDetails(record)) {
    return toNumber(record.monthlyDetails?.[month]?.amount);
  }
  return toNumber(record.months?.[month]);
};

// Consumo (kWh / m³) de un mes. Devuelve null cuando el dato no existe:
// nunca se inventa un número.
export const getMonthConsumption = (record: SupplyRecord, month: MonthKey): number | null => {
  if (hasMonthlyDetails(record)) {
    return toNumber(record.monthlyDetails?.[month]?.consumption);
  }
  return null;
};

// N° de recibo de un mes
export const getMonthReceipt = (record: SupplyRecord, month: MonthKey): string => {
  if (hasMonthlyDetails(record)) {
    return (record.monthlyDetails?.[month]?.receipt || '').toString();
  }
  return '';
};

// ¿Ese mes tiene algún dato real cargado?
export const monthHasData = (record: SupplyRecord, month: MonthKey): boolean => {
  const consumption = getMonthConsumption(record, month);
  return getMonthAmount(record, month) > 0 || (consumption !== null && consumption > 0) || getMonthReceipt(record, month) !== '';
};

export const getAnnualAmount = (record: SupplyRecord): number =>
  MONTH_KEYS.reduce((sum, m) => sum + getMonthAmount(record, m), 0);

// Consumo anual; null si el registro no tiene detalle mensual
export const getAnnualConsumption = (record: SupplyRecord): number | null => {
  if (!hasMonthlyDetails(record)) return null;
  return MONTH_KEYS.reduce((sum, m) => sum + (getMonthConsumption(record, m) || 0), 0);
};

// Último mes (del más reciente al más antiguo) que tenga datos
export const getLatestMonthWithData = (record: SupplyRecord): MonthKey | null => {
  for (let i = MONTH_KEYS.length - 1; i >= 0; i--) {
    if (monthHasData(record, MONTH_KEYS[i])) return MONTH_KEYS[i];
  }
  return null;
};

// Recibo más reciente registrado (para la vista "Año Completo")
export const getLatestReceipt = (record: SupplyRecord): string => {
  for (let i = MONTH_KEYS.length - 1; i >= 0; i--) {
    const receipt = getMonthReceipt(record, MONTH_KEYS[i]);
    if (receipt) return receipt;
  }
  return record.receiptNumber || '';
};

// Construye el detalle completo de 12 meses para el formulario de edición.
// Si el registro es del formato antiguo, conserva sus montos en soles
// para que editar NO borre los meses ya cargados.
export const buildMonthlyDetailsForForm = (record: SupplyRecord | null): Record<MonthKey, MonthDetail> => {
  const result = {} as Record<MonthKey, MonthDetail>;
  MONTH_KEYS.forEach(m => {
    const base = emptyMonthDetail();
    if (record && hasMonthlyDetails(record)) {
      const saved: any = record.monthlyDetails?.[m] || {};
      result[m] = {
        receipt: (saved.receipt || '').toString(),
        previousReading: toNumber(saved.previousReading),
        currentReading: toNumber(saved.currentReading),
        consumption: toNumber(saved.consumption),
        amount: toNumber(saved.amount)
      };
    } else if (record) {
      result[m] = { ...base, amount: toNumber(record.months?.[m]) };
    } else {
      result[m] = base;
    }
  });
  return result;
};

// ============================================================
// Duplicados: mismo N° de suministro + mismo servicio + mismo año
// ============================================================
export const normalizeSupplyNumber = (value: string | undefined): string =>
  (value || '').toString().trim().toLowerCase().replace(/\s+/g, '');

export const duplicateKey = (supplyNumber: string, utilityType: UtilityType, year: number | undefined): string =>
  `${normalizeSupplyNumber(supplyNumber)}|${utilityType}|${Number(year) || 2026}`;

export const findExistingSupply = (
  records: SupplyRecord[],
  supplyNumber: string,
  utilityType: UtilityType,
  year: number | undefined,
  excludeId?: string
): SupplyRecord | null => {
  if (!normalizeSupplyNumber(supplyNumber)) return null;
  const key = duplicateKey(supplyNumber, utilityType, year);
  return records.find(r => r.id !== excludeId && duplicateKey(r.supplyNumber, r.utilityType, r.year) === key) || null;
};

export const findDuplicateGroups = (records: SupplyRecord[], utilityType: UtilityType): SupplyRecord[][] => {
  const groups = new Map<string, SupplyRecord[]>();
  records
    .filter(r => r.utilityType === utilityType && normalizeSupplyNumber(r.supplyNumber))
    .forEach(r => {
      const key = duplicateKey(r.supplyNumber, r.utilityType, r.year);
      groups.set(key, [...(groups.get(key) || []), r]);
    });
  return Array.from(groups.values()).filter(g => g.length > 1);
};

// ============================================================
// Períodos fijos de calendario
// ============================================================
export type PeriodType = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export const QUARTERS: MonthKey[][] = [
  ['ene', 'feb', 'mar'],
  ['abr', 'may', 'jun'],
  ['jul', 'ago', 'set'],
  ['oct', 'nov', 'dic']
];

export const SEMESTERS: MonthKey[][] = [
  ['ene', 'feb', 'mar', 'abr', 'may', 'jun'],
  ['jul', 'ago', 'set', 'oct', 'nov', 'dic']
];

export const getPeriodMonths = (period: PeriodType, index: number): MonthKey[] => {
  if (period === 'monthly') return [MONTH_KEYS[Math.min(Math.max(index, 0), 11)]];
  if (period === 'quarterly') return QUARTERS[Math.min(Math.max(index, 0), 3)];
  if (period === 'semiannual') return SEMESTERS[Math.min(Math.max(index, 0), 1)];
  return [...MONTH_KEYS];
};

export const getPeriodLabel = (period: PeriodType, index: number): string => {
  if (period === 'monthly') return MONTH_FULL_NAMES[MONTH_KEYS[Math.min(Math.max(index, 0), 11)]];
  if (period === 'quarterly') return `Trimestre ${index + 1} (${QUARTERS[index].map(m => MONTH_LABELS[m]).join('-')})`;
  if (period === 'semiannual') return `Semestre ${index + 1} (${SEMESTERS[index].map(m => MONTH_LABELS[m]).join('-')})`;
  return 'Año Completo';
};

export const formatSoles = (value: number): string =>
  `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatNumber = (value: number): string =>
  Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// ============================================================
// Recuperación de datos guardados por versiones anteriores
// (hasta el 22/09 se guardaba en dos claves separadas)
// ============================================================
export const STORAGE_KEY = 'infradash_supply_records_v1';
export const LEGACY_ENERGY_KEY = 'infradash_energy_records';
export const LEGACY_WATER_KEY = 'infradash_water_records';
export const MIGRATION_FLAG_KEY = 'infradash_migracion_claves_antiguas_v1';

const readArray = (storage: Storage, key: string): any[] => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const isUntouchedSample = (record: SupplyRecord, samples: SupplyRecord[]): boolean => {
  const sample = samples.find(s => s.id === record.id);
  if (!sample) return false;
  return JSON.stringify(sample) === JSON.stringify(record);
};

// Carga los registros combinando la clave actual con las claves antiguas.
// Las claves antiguas NUNCA se borran: quedan como respaldo.
export const loadRecordsFromStorage = (storage: Storage, samples: SupplyRecord[]): SupplyRecord[] => {
  const current = readArray(storage, STORAGE_KEY) as SupplyRecord[];
  // ¿El sistema ya se usó antes en este navegador? (aunque hoy esté vacío)
  const alreadyInitialized = storage.getItem(STORAGE_KEY) !== null;
  const alreadyMigrated = storage.getItem(MIGRATION_FLAG_KEY) === '1';

  let legacy: SupplyRecord[] = [];
  if (!alreadyMigrated) {
    const legacyEnergy = readArray(storage, LEGACY_ENERGY_KEY).map(r => ({ ...r, utilityType: 'energy' as UtilityType }));
    const legacyWater = readArray(storage, LEGACY_WATER_KEY).map(r => ({ ...r, utilityType: 'water' as UtilityType }));
    legacy = [...legacyEnergy, ...legacyWater] as SupplyRecord[];
  }

  if (legacy.length === 0) {
    // Si el usuario borró todo a propósito, se respeta la tabla vacía:
    // los datos de ejemplo solo aparecen la primera vez que se abre el sistema.
    if (current.length > 0 || alreadyInitialized) return current;
    return samples;
  }

  // Si la clave actual solo tiene los datos de ejemplo sin tocar, se descartan
  const currentReal = current.filter(r => !isUntouchedSample(r, samples));
  const usedIds = new Set(currentReal.map(r => String(r.id)));
  const merged: SupplyRecord[] = [...currentReal];

  legacy.forEach((r, idx) => {
    const id = String(r.id ?? '');
    const sameIdAndContent = currentReal.some(c => String(c.id) === id && JSON.stringify(c) === JSON.stringify(r));
    if (sameIdAndContent) return;
    const safeId = id && !usedIds.has(id) ? id : `legacy-${r.utilityType}-${idx}-${id || 'sin-id'}`;
    usedIds.add(safeId);
    merged.push({ ...r, id: safeId });
  });

  return merged;
};

// ============================================================
// Unir copias duplicadas de un mismo suministro
// ============================================================
export interface MergeResult {
  merged: SupplyRecord;
  removeIds: string[];
  conflicts: MonthKey[];
}

const sameDetail = (a: MonthDetail, b: MonthDetail): boolean =>
  a.amount === b.amount &&
  a.consumption === b.consumption &&
  a.receipt.trim() === b.receipt.trim() &&
  a.previousReading === b.previousReading &&
  a.currentReading === b.currentReading;

// Une las copias en la que tiene más meses con datos.
// Si dos copias tienen datos DISTINTOS en el mismo mes, no se une nada
// (se informa el conflicto para que el usuario decida).
export const mergeDuplicateGroup = (group: SupplyRecord[]): MergeResult => {
  const ranked = [...group].sort(
    (a, b) => MONTH_KEYS.filter(m => monthHasData(b, m)).length - MONTH_KEYS.filter(m => monthHasData(a, m)).length
  );
  const keep = ranked[0];
  const details = ranked.map(r => buildMonthlyDetailsForForm(r));
  const conflicts: MonthKey[] = [];
  const mergedDetails = {} as Record<MonthKey, MonthDetail>;
  const mergedMonths: any = {};
  let totalAmount = 0;
  let totalConsumption = 0;
  let latestReceipt = '';

  MONTH_KEYS.forEach(m => {
    const withData = ranked
      .map((r, i) => ({ has: monthHasData(r, m), d: details[i][m] }))
      .filter(x => x.has)
      .map(x => x.d);
    let chosen = withData.length > 0 ? withData[0] : details[0][m];
    if (withData.length > 1 && withData.some(d => !sameDetail(d, withData[0]))) {
      conflicts.push(m);
    }
    mergedDetails[m] = chosen;
    mergedMonths[m] = chosen.amount;
    totalAmount += chosen.amount;
    totalConsumption += chosen.consumption;
    if (chosen.receipt) latestReceipt = chosen.receipt;
  });

  const merged: SupplyRecord = {
    ...keep,
    monthlyDetails: mergedDetails,
    months: mergedMonths,
    totalAmount: Number(totalAmount.toFixed(2)),
    consumption: Number(totalConsumption.toFixed(2)),
    receiptNumber: latestReceipt || keep.receiptNumber || ''
  };
  delete (merged as any).selectedMonth;

  return { merged, removeIds: ranked.slice(1).map(r => r.id), conflicts };
};

// ============================================================
// Llenado asistido del formulario (11/10/2026)
// ============================================================

// Un mes del formulario está totalmente vacío (nada escrito)
export const isEmptyMonthDetail = (d: Partial<MonthDetail> | undefined): boolean =>
  !d ||
  ((d.receipt || '').toString().trim() === '' &&
    !(Number(d.previousReading) > 0) &&
    !(Number(d.currentReading) > 0) &&
    !(Number(d.consumption) > 0) &&
    !(Number(d.amount) > 0));

// Un mes ya guardado (se ve en verde): tiene monto, consumo o N° de recibo
export const detailHasSavedData = (d: Partial<MonthDetail> | undefined): boolean =>
  !!d && (Number(d.amount) > 0 || Number(d.consumption) > 0 || (d.receipt || '').toString().trim() !== '');

// Última lectura actual REAL (mayor que 0) antes del mes indicado.
// Salta los meses sin lectura. Devuelve 0 si no hay ninguna.
export const lastRealReadingBefore = (details: Record<MonthKey, MonthDetail>, month: MonthKey): number => {
  const idx = MONTH_KEYS.indexOf(month);
  for (let i = idx - 1; i >= 0; i--) {
    const r = Number(details[MONTH_KEYS[i]]?.currentReading) || 0;
    if (r > 0) return r;
  }
  return 0;
};

// Mes en que se abre el lápiz: el siguiente al último mes con datos
export const nextMonthToFill = (record: SupplyRecord | null): MonthKey => {
  if (!record) return 'ene';
  const last = getLatestMonthWithData(record);
  if (!last) return 'ene';
  const idx = MONTH_KEYS.indexOf(last);
  return MONTH_KEYS[Math.min(idx + 1, MONTH_KEYS.length - 1)];
};

// ============================================================
// Revisar llenado: detecta meses que pudieron quedar mal llenados
// (solo informa; nunca cambia datos)
// ============================================================
export type FillingIssueType = 'hueco' | 'lecturas' | 'recibo' | 'atrasado';

export interface FillingIssue {
  type: FillingIssueType;
  month: MonthKey; // mes que se abre con el lápiz para corregir
  message: string;
}

export interface FillingReport {
  record: SupplyRecord;
  issues: FillingIssue[];
}

const fmtReading = (n: number) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

export const findFillingIssues = (records: SupplyRecord[], utilityType: UtilityType): FillingReport[] => {
  const list = records.filter(r => r.utilityType === utilityType);

  // Último mes con datos más frecuente (a dónde llega la mayoría)
  const lastIdx = list
    .map(r => getLatestMonthWithData(r))
    .filter((m): m is MonthKey => !!m)
    .map(m => MONTH_KEYS.indexOf(m));
  const counts: Record<number, number> = {};
  lastIdx.forEach(i => (counts[i] = (counts[i] || 0) + 1));
  let modeIdx = -1;
  let modeCount = 0;
  Object.keys(counts).forEach(k => {
    const i = Number(k);
    if (counts[i] > modeCount || (counts[i] === modeCount && i > modeIdx)) {
      modeIdx = i;
      modeCount = counts[i];
    }
  });

  const reports: FillingReport[] = [];
  list.forEach(record => {
    if (!hasMonthlyDetails(record)) return;
    const details = buildMonthlyDetailsForForm(record);
    const issues: FillingIssue[] = [];
    const withData = MONTH_KEYS.filter(m => detailHasSavedData(details[m]));
    if (withData.length === 0) return;
    const firstIdx = MONTH_KEYS.indexOf(withData[0]);
    const lastIdxRec = MONTH_KEYS.indexOf(withData[withData.length - 1]);

    // 1) Mes vacío entre meses con datos
    for (let i = firstIdx + 1; i < lastIdxRec; i++) {
      const m = MONTH_KEYS[i];
      if (!detailHasSavedData(details[m])) {
        issues.push({
          type: 'hueco',
          month: m,
          message: `${MONTH_FULL_NAMES[m].toUpperCase()} está vacío, pero hay meses con datos antes y después. Puede que su recibo se haya escrito en otro mes.`
        });
      }
    }

    // 2) Lecturas que no encadenan: lectura anterior ≠ lectura actual del mes previo con lectura
    let prevMonth: MonthKey | null = null;
    MONTH_KEYS.forEach(m => {
      const d = details[m];
      const prevR = Number(d.previousReading) || 0;
      const currR = Number(d.currentReading) || 0;
      if (prevR > 0 && prevMonth) {
        const before = Number(details[prevMonth].currentReading) || 0;
        if (Math.abs(before - prevR) > 0.01) {
          issues.push({
            type: 'lecturas',
            month: m,
            message: `La lectura anterior de ${MONTH_FULL_NAMES[m].toUpperCase()} (${fmtReading(prevR)}) no coincide con la lectura actual de ${MONTH_FULL_NAMES[prevMonth].toUpperCase()} (${fmtReading(before)}). Compare ambos meses con sus recibos (también puede ser cambio de medidor).`
          });
        }
      }
      if (currR > 0) prevMonth = m;
    });

    // 3) Mismo N° de recibo en dos o más meses
    const byReceipt: Record<string, MonthKey[]> = {};
    MONTH_KEYS.forEach(m => {
      const rc = (details[m].receipt || '').toString().trim().toUpperCase();
      if (rc) (byReceipt[rc] = byReceipt[rc] || []).push(m);
    });
    Object.keys(byReceipt).forEach(rc => {
      const ms = byReceipt[rc];
      if (ms.length > 1) {
        issues.push({
          type: 'recibo',
          month: ms[0],
          message: `El recibo ${rc} está registrado en ${ms.map(x => MONTH_FULL_NAMES[x].toUpperCase()).join(' y ')}. Cada mes debe tener su propio recibo.`
        });
      }
    });

    // 4) Suministro atrasado respecto a la mayoría
    if (modeIdx >= 0 && lastIdxRec < modeIdx) {
      const next = MONTH_KEYS[lastIdxRec + 1];
      issues.push({
        type: 'atrasado',
        month: next,
        message: `Su último mes con datos es ${MONTH_FULL_NAMES[MONTH_KEYS[lastIdxRec]].toUpperCase()}; la mayoría de suministros llega hasta ${MONTH_FULL_NAMES[MONTH_KEYS[modeIdx]].toUpperCase()}. Verifique si falta registrar ${MONTH_FULL_NAMES[next].toUpperCase()} o si su recibo quedó en el mes anterior.`
      });
    }

    if (issues.length > 0) reports.push({ record, issues });
  });
  return reports;
};
