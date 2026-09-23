import { SupplyRecord } from './types';

export function exportHousingRecordsToExcel(records: SupplyRecord[], utilityType: string) {
  const utilityName = utilityType === 'energy' ? 'Energia_Electrica' : 'Agua_Potable';
  
  // Cabeceras oficiales para el reporte de viviendas del Infradash
  const headers = [
    'Nro Suministro', 
    'Propiedad / Vivienda', 
    'Zona / Categoria', 
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic', 
    'Consumo Acumulado', 
    'Monto Total (S/)'
  ];
  
  const rows = records.map(r => [
    `"${r.supplyNumber}"`,
    `"${r.propertyName || r.address || 'Sin nombre'}"`,
    `"${r.category || 'Talara'}"`,
    r.months?.ene || 0,
    r.months?.feb || 0,
    r.months?.mar || 0,
    r.months?.abr || 0,
    r.months?.may || 0,
    r.months?.jun || 0,
    r.months?.jul || 0,
    r.months?.ago || 0,
    r.months?.set || 0,
    r.months?.oct || 0,
    r.months?.nov || 0,
    r.months?.dic || 0,
    r.consumption || 0,
    r.totalAmount || r.amount || 0
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + 
    [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Infradash_Reporte_${utilityName}_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}