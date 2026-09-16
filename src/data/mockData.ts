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
  { month: 'Ene', amount: 95000 },
  { month: 'Feb', amount: 102000 },
  { month: 'Mar', amount: 98000 },
  { month: 'Abr', amount: 105000 },
  { month: 'May', amount: 110000 },
  { month: 'Jun', amount: 108000 },
  { month: 'Jul', amount: 115000 },
  { month: 'Ago', amount: 103805 },
  { month: 'Sep', amount: 99000 },
  { month: 'Oct', amount: 101000 },
  { month: 'Nov', amount: 107000 },
  { month: 'Dic', amount: 112000 },
];

export const WATER_MONTHLY_TREND = [
  { month: 'Ene', amount: 3200, metric: 3100 },
  { month: 'Feb', amount: 3500, metric: 3400 },
  { month: 'Mar', amount: 3800, metric: 3700 },
  { month: 'Abr', amount: 3600, metric: 3500 },
  { month: 'May', amount: 3900, metric: 3800 },
  { month: 'Jun', amount: 4100, metric: 4000 },
  { month: 'Jul', amount: 4300, metric: 4200 },
  { month: 'Ago', amount: 3769, metric: 3700 },
  { month: 'Sep', amount: 3800, metric: 3750 },
  { month: 'Oct', amount: 3950, metric: 3850 },
  { month: 'Nov', amount: 4100, metric: 4000 },
  { month: 'Dic', amount: 4221, metric: 4100 }
];

export const ENERGY_TOP_PROPERTIES = [
  { name: 'Av. C 00 Club Talara', amount: 45000 },
  { name: 'Lt TABLAZO 51 Sec. Verdun', amount: 32000 },
  { name: 'Lt TABLAZO 0002 Sec. Pariñas Campo', amount: 26805 },
];

export const WATER_TOP_PROPERTIES = [
  { name: 'REFINERIA CER. CERCADO 2', amount: 35000 },
  { name: 'AV. GRAU CER. CERCADO 1', amount: 28000 },
  { name: 'Bloque P. Pariñas', amount: 21000 },
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
    category: 'Talara',
    months: { ene: 12000, feb: 11500, mar: 13000, abr: 12500, may: 14000, jun: 11000, jul: 12500, ago: 13000, set: 12000, oct: 11800, nov: 12200, dic: 12700 },
    totalAmount: 147700,   
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
    category: 'Almacén',
    months: { ene: 8000, feb: 8500, mar: 9000, abr: 8200, may: 9500, jun: 8800, jul: 9100, ago: 8900, set: 8700, oct: 9000, nov: 9200, dic: 9600 },
    totalAmount: 106500,
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
    months: { ene: 7000, feb: 7200, mar: 7500, abr: 7100, may: 7800, jun: 7400, jul: 7600, ago: 7300, set: 7100, oct: 7400, nov: 7500, dic: 7800 },
    totalAmount: 89100,
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
    category: 'Planta Refineria Talara',
    // En el registro 'a1'
    months: { ene: 5000, feb: 5200, mar: 5100, abr: 5300, may: 5500, jun: 5400, jul: 5800, ago: 5600, set: 5200, oct: 5300, nov: 5500, dic: 5700 },
    totalAmount: 64600,
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
    category: 'Planta Refineria Talara',
    months: { ene: 4000, feb: 4200, mar: 4100, abr: 4300, may: 4500, jun: 4400, jul: 4600, ago: 4500, set: 4200, oct: 4300, nov: 4400, dic: 4600 },
    totalAmount: 52100,
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
    category: 'Talara',
    months: { ene: 3000, feb: 3100, mar: 3200, abr: 3100, may: 3300, jun: 3200, jul: 3400, ago: 3300, set: 3100, oct: 3200, nov: 3300, dic: 3500 },
    totalAmount: 38700,
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
    months: { ene: 2500, feb: 2600, mar: 2700, abr: 2500, may: 2800, jun: 2700, jul: 2900, ago: 2800, set: 2600, oct: 2700, nov: 2800, dic: 2900 },
    totalAmount: 32500, 
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