import React, { useState } from 'react';
import { SupplyRecord, UtilityType } from '../types';
import { FileSpreadsheet, MoreVertical, Mail, Printer, TrendingUp, Building2, Share2 } from 'lucide-react';

interface ChartsSectionProps {
  utilityType: UtilityType;
  records: SupplyRecord[];
  onShowToast: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({ utilityType, records, onShowToast }) => {
  const [openMenu, setOpenMenu] = useState<'evolution' | 'top' | null>(null);

  // Mapeo estricto de los 12 meses del año
  const monthKeys = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'] as const;
  const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

  // Total gastado por mes de manera segura utilizando las 12 llaves
  const monthlyTotals = monthKeys.map(m =>
    records.reduce((sum, r) => sum + (Number(r.months?.[m]) || 0), 0)
  );

  const totalAnnual = monthlyTotals.reduce((a, b) => a + b, 0);
  const averageMonthly = totalAnnual / 12;

  // Top consumos por predio calculados sobre los 12 meses completos
  const topProperties = records
    .map(r => ({
      name: r.propertyName || r.address || 'S/N',
      total: monthKeys.reduce((acc, m) => acc + (Number(r.months?.[m]) || 0), 0)
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // 1. Descarga real y útil de datos estructurados en formato CSV/Excel con codificación UTF-8
  const handleDownloadExcel = (chartTitle: string, typeData: 'evolution' | 'top') => {
    setOpenMenu(null);
    let headers: string[] = [];
    let rows: string[][] = [];

    if (typeData === 'evolution') {
      headers = ['Mes', 'Gasto Total Facturado (S/)'];
      rows = monthKeys.map((m, idx) => [monthLabels[idx], (monthlyTotals[idx] || 0).toFixed(2)]);
    } else {
      headers = ['N°', 'Predio / Sede', 'Gasto Anual Acumulado (S/)'];
      rows = topProperties.map((p, idx) => [(idx + 1).toString(), `"${p.name}"`, p.total.toFixed(2)]);
    }

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_${chartTitle.replace(/\s+/g, '_')}_${utilityType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast('Exportación Exitosa', `Los datos de "${chartTitle}" se descargaron en formato Excel/CSV.`, 'success');
  };

  // 2. Compartir por correo técnico redactando los montos clave para otros técnicos
  const handleShareEmail = (chartTitle: string) => {
    setOpenMenu(null);
    const utilityName = utilityType === 'energy' ? 'Energía Eléctrica' : 'Agua Potable';
    const subject = encodeURIComponent(`Reporte Técnico: ${chartTitle} - ${utilityName}`);
    
    let bodyText = `Estimado equipo técnico,\n\nSe comparte el resumen consolidado del indicador de ${utilityName} (${chartTitle}):\n`;
    if (chartTitle.includes('Evolución')) {
      bodyText += `- Gasto Anual Total: S/ ${totalAnnual.toFixed(2)}\n- Promedio Mensual: S/ ${averageMonthly.toFixed(2)}\n`;
    } else {
      bodyText += topProperties.map((p, i) => `${i + 1}. ${p.name}: S/ ${p.total.toFixed(2)}`).join('\n');
    }
    bodyText += `\n\nGenerado desde el sistema de control de suministros.`;

    const mailtoLink = `mailto:?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailtoLink;

    onShowToast('Correo Preparado', 'Se abrió su cliente de correo para enviar los datos a los técnicos.', 'info');
  };

  // 3. Acción auxiliar para copiar enlace o imprimir si se requiere en vista general
  const handleAction = (chartName: string, action: string) => {
    setOpenMenu(null);
    if (action === 'imprimir') {
      window.print();
    } else if (action === 'compartir') {
      navigator.clipboard.writeText(window.location.href);
      onShowToast('Enlace Copiado', `Enlace de vista de ${chartName} copiado al portapapeles.`, 'info');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Gráfico 1: Evolución Mensual de Gasto */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-[#cbd5e1] p-5 shadow-sm flex flex-col justify-between relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-[#191c1e] text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#004ac6]" />
              Evolución Mensual de Gasto (S/)
            </h3>
            <p className="text-xs text-[#434655]">Facturación consolidada de los 12 meses del ejercicio</p>
          </div>
          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'evolution' ? null : 'evolution')}
              className="p-1.5 text-[#434655] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {openMenu === 'evolution' && (
              <div className="absolute right-0 top-8 bg-white border border-[#cbd5e1] rounded-lg shadow-lg py-1 w-44 z-20 text-xs">
                <button onClick={() => handleDownloadExcel('Evolucion_Mensual', 'evolution')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Descargar en Excel
                </button>
                <button onClick={() => handleShareEmail('Evolución Mensual de Gasto')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                  <Mail className="w-3.5 h-3.5 text-blue-600" /> Compartir por Correo
                </button>
                <button onClick={() => handleAction('Evolución Mensual', 'compartir')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                  <Share2 className="w-3.5 h-3.5 text-slate-600" /> Copiar Enlace
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mini Barras de Consumo */}
        <div className="h-44 flex items-end justify-between gap-1 pt-6 px-2 border-b border-slate-100 pb-2">
          {monthlyTotals.map((val, idx) => {
            const maxVal = Math.max(...monthlyTotals, 1);
            const heightPercent = Math.round((val / maxVal) * 100);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-800 text-white text-[10px] py-0.5 px-1.5 rounded transition-opacity whitespace-nowrap z-10 shadow">
                  S/ {val.toFixed(2)}
                </div>
                <div
                  style={{ height: `${Math.max(heightPercent, 4)}%` }}
                  className={`w-full max-w-[28px] rounded-t transition-all ${
                    utilityType === 'energy' ? 'bg-[#004ac6] hover:bg-blue-700' : 'bg-[#00687a] hover:bg-teal-700'
                  }`}
                />
                <span className="text-[10px] font-semibold text-[#434655] mt-2">{monthLabels[idx]}</span>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-3 text-xs text-[#434655]">
          <span>Promedio Mensual: <strong>S/ {averageMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
          <span>Gasto Anual Acumulado: <strong>S/ {totalAnnual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
        </div>
      </div>

      {/* Gráfico 2: Top Consumo por Predio */}
      <div className="bg-white rounded-xl border border-[#cbd5e1] p-5 shadow-sm flex flex-col justify-between relative">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-[#191c1e] text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#004ac6]" />
              Top Consumo por Predio
            </h3>
            <p className="text-xs text-[#434655]">Sedes con mayor facturación anual</p>
          </div>
          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'top' ? null : 'top')}
              className="p-1.5 text-[#434655] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {openMenu === 'top' && (
              <div className="absolute right-0 top-8 bg-white border border-[#cbd5e1] rounded-lg shadow-lg py-1 w-44 z-20 text-xs">
                <button onClick={() => handleDownloadExcel('Top_Consumo_Predios', 'top')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Descargar en Excel
                </button>
                <button onClick={() => handleShareEmail('Top de Consumo por Predio')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                  <Mail className="w-3.5 h-3.5 text-blue-600" /> Compartir por Correo
                </button>
                <button onClick={() => handleAction('Top Consumo', 'compartir')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                  <Share2 className="w-3.5 h-3.5 text-slate-600" /> Copiar Enlace
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 my-2 flex-1 justify-center">
          {topProperties.length === 0 ? (
            <p className="text-xs text-center text-slate-400 py-6">No hay registros cargados para calcular el Top de consumos.</p>
          ) : (
            topProperties.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-semibold text-[#191c1e]">
                  <span className="truncate max-w-[180px]" title={item.name}>{idx + 1}. {item.name}</span>
                  <span>S/ {item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${utilityType === 'energy' ? 'bg-[#004ac6]' : 'bg-[#00687a]'}`}
                    style={{ width: `${Math.min(100, Math.max(5, (item.total / (totalAnnual || 1)) * 100))}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <span className="text-[11px] text-[#434655] pt-2 border-t border-slate-100">
          Mostrando las sedes principales registradas.
        </span>
      </div>
    </div>
  );
};