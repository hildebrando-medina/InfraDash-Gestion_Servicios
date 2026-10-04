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
