import { SupplyRecord } from '../types';

// Mapeo de meses requerido por RecordModal.tsx
export const MONTH_NAMES: { [key: string]: string } = {
  ene: 'Enero',
  feb: 'Febrero',
  mar: 'Marzo',
  abr: 'Abril',
  may: 'Mayo',
  jun: 'Junio',
  jul: 'Julio',
  ago: 'Agosto',
  set: 'Septiembre',
  oct: 'Octubre',
  nov: 'Noviembre',
  dic: 'Diciembre'
};

// Tendencias requeridas por ChartsSection.tsx
export const ENERGY_MONTHLY_TREND = [
  { month: 'Ene', amount: 0 },
  { month: 'Feb', amount: 0 },
  { month: 'Mar', amount: 0 },
  { month: 'Abr', amount: 0 },
  { month: 'May', amount: 0 },
  { month: 'Jun', amount: 0 },
  { month: 'Jul', amount: 0 },
  { month: 'Ago', amount: 0 },
  { month: 'Sep', amount: 0 },
  { month: 'Oct', amount: 0 },
  { month: 'Nov', amount: 0 },
  { month: 'Dic', amount: 0 }
];

export const WATER_MONTHLY_TREND = [
  { month: 'Ene', amount: 0 },
  { month: 'Feb', amount: 0 },
  { month: 'Mar', amount: 0 },
  { month: 'Abr', amount: 0 },
  { month: 'May', amount: 0 },
  { month: 'Jun', amount: 0 },
  { month: 'Jul', amount: 0 },
  { month: 'Ago', amount: 0 },
  { month: 'Sep', amount: 0 },
  { month: 'Oct', amount: 0 },
  { month: 'Nov', amount: 0 },
  { month: 'Dic', amount: 0 }
];

export const ENERGY_TOP_PROPERTIES = [
  { name: 'Av. C 00 Club Talara', amount: 0 },
  { name: 'Lt TABLAZO 51 Sec. Verdun', amount: 0 },
  { name: 'Lt TABLAZO 0002 Sec. Pariñas Campo', amount: 0 }
];

export const WATER_TOP_PROPERTIES = [
  { name: 'REFINERIA CER. CERCADO 2', amount: 0 },
  { name: 'AV. GRAU CER. CERCADO 1', amount: 0 },
  { name: 'Bloque P. Pariñas', amount: 0 }
];

// ================= ENERGÍA ELÉCTRICA =================
export const INITIAL_ENERGY_RECORDS: SupplyRecord[] = [
  {
    id: 'e1',
    year: 2026,
    supplyNumber: '8533426',
    propertyName: 'Av. C 00 Club Talara',
    address: 'Talara',
    debtMonths: 0,
    receiptNumber: 'REC-101',
    status: 'active',
    utilityType: 'energy',
    category: 'Sede Principal',
    months: { ene: 0, feb: 0, mar: 0, abr: 0, may: 0, jun: 0, jul: 0, ago: 0, set: 0, oct: 0, nov: 0, dic: 0 },
    totalAmount: 0,
    tariffType: 'Industrial MT',
    meterId: 'MED-8533426',
    lastUpdated: '2026-08-19'
  },
  {
    id: 'e2',
    year: 2026,
    supplyNumber: '8661382',
    propertyName: 'Lt TABLAZO 51 Sec. Verdun',
    address: 'Verdun',
    debtMonths: 0,
    receiptNumber: 'REC-102',
    status: 'active',
    utilityType: 'energy',
    category: 'Taller / Mantenimiento',
    months: { ene: 0, feb: 0, mar: 0, abr: 0, may: 0, jun: 0, jul: 0, ago: 0, set: 0, oct: 0, nov: 0, dic: 0 },
    totalAmount: 0,
    tariffType: 'Industrial MT',
    meterId: 'MED-8661382',
    lastUpdated: '2026-08-19'
  },
  {
    id: 'e3',
    year: 2026,
    supplyNumber: '8661490',
    propertyName: 'Lt TABLAZO 0002 Sec. Pariñas Campo',
    address: 'Pariñas',
    debtMonths: 0,
    receiptNumber: 'REC-103',
    status: 'active',
    utilityType: 'energy',
    category: 'Almacén',
    months: { ene: 0, feb: 0, mar: 0, abr: 0, may: 0, jun: 0, jul: 0, ago: 0, set: 0, oct: 0, nov: 0, dic: 0 },
    totalAmount: 0,
    tariffType: 'Industrial MT',
    meterId: 'MED-8661490',
    lastUpdated: '2026-08-19'
  }
];

// ================= AGUA POTABLE =================
export const INITIAL_WATER_RECORDS: SupplyRecord[] = [
  {
    id: 'a1',
    year: 2026,
    supplyNumber: '71155016',
    propertyName: 'REFINERIA CER. CERCADO 2',
    address: 'Talara',
    debtMonths: 0,
    receiptNumber: 'REC-001',
    status: 'active',
    utilityType: 'water',
    category: 'Planta Industrial',
    months: { ene: 0, feb: 0, mar: 0, abr: 0, may: 0, jun: 0, jul: 0, ago: 0, set: 0, oct: 0, nov: 0, dic: 0 },
    totalAmount: 0,
    tariffType: 'Comercial',
    meterId: 'MED-71155016',
    lastUpdated: '2026-08-19'
  },
  {
    id: 'a2',
    year: 2026,
    supplyNumber: '71155030',
    propertyName: 'AV. GRAU (A-1-INDUSTRIAL) CER. CERCADO 1',
    address: 'Talara',
    debtMonths: 0,
    receiptNumber: 'REC-002',
    status: 'active',
    utilityType: 'water',
    category: 'Planta Industrial',
    months: { ene: 0, feb: 0, mar: 0, abr: 0, may: 0, jun: 0, jul: 0, ago: 0, set: 0, oct: 0, nov: 0, dic: 0 },
    totalAmount: 0,
    tariffType: 'Comercial',
    meterId: 'MED-71155030',
    lastUpdated: '2026-08-19'
  },
  {
    id: 'a3',
    year: 2026,
    supplyNumber: '71155051',
    propertyName: 'Bloque P. Pariñas - CER. CERCADO 2',
    address: 'Talara',
    debtMonths: 0,
    receiptNumber: 'REC-003',
    status: 'active',
    utilityType: 'water',
    category: 'Sede Principal',
    months: { ene: 0, feb: 0, mar: 0, abr: 0, may: 0, jun: 0, jul: 0, ago: 0, set: 0, oct: 0, nov: 0, dic: 0 },
    totalAmount: 0,
    tariffType: 'Comercial',
    meterId: 'MED-71155051',
    lastUpdated: '2026-08-19'
  },
  {
    id: 'a4',
    year: 2026,
    supplyNumber: '71155072',
    propertyName: 'CONDOMINIO F.A CER. CERCADO 2',
    address: 'Talara',
    debtMonths: 0,
    receiptNumber: 'REC-004',
    status: 'active',
    utilityType: 'water',
    category: 'Oficinas Administrativas',
    months: { ene: 0, feb: 0, mar: 0, abr: 0, may: 0, jun: 0, jul: 0, ago: 0, set: 0, oct: 0, nov: 0, dic: 0 },
    totalAmount: 0,
    tariffType: 'Comercial',
    meterId: 'MED-71155072',
    lastUpdated: '2026-08-19'
  }
];

// Arreglo combinado y alias de respaldo
export const INITIAL_SUPPLIES: SupplyRecord[] = [
  ...INITIAL_ENERGY_RECORDS,
  ...INITIAL_WATER_RECORDS
];

export const mockSupplies = INITIAL_SUPPLIES;
export const MOCK_SUPPLIES = INITIAL_SUPPLIES;
export const MOCK_RECORDS = INITIAL_SUPPLIES;