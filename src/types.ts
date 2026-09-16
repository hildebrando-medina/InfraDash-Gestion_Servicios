export type UtilityType = 'energy' | 'water';

export type UserRole = 'admin' | 'consult';

export interface MonthlyValues {
  ene: number;
  feb: number;
  mar: number;
  abr: number;
  may: number;
  jun: number;
  jul?: number;
  ago?: number;
  set?: number;
  oct?: number;
  nov?: number;
  dic?: number;
}

export interface SupplyRecord {
  id: string;
  year: number;
  supplyNumber: string;
  propertyName: string;
  address: string;
  debtMonths: number;
  receiptNumber: string;
  status: 'active' | 'inactive';
  utilityType: UtilityType;
  category: 'Talara' | 'Talara Alta' | 'Organos' | 'Negritos' | 'Planta Refineria Talara'| 'Almacén' | 'Oficinas Administrativas' | 'Talleres' | 'Viviendas Punta Arenas';
  months: MonthlyValues;
  totalAmount: number;
  tariffType?: string;
  meterId?: string;
  lastUpdated?: string;
  consumption?: number;
  amount?: number;
  selectedMonth?: string;
}

export interface FilterState {
  search: string;
  year: number | 'all';
  debtFilter: 'all' | 'with_debt' | 'no_debt';
  categoryFilter: string;
  statusFilter: 'all' | 'active' | 'inactive';
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}
