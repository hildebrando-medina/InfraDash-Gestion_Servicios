import React, { useState } from 'react';
import { SupplyRecord, UtilityType } from '../types';
import { FileSpreadsheet, MoreVertical, Mail, TrendingUp, Building2, Share2, CalendarRange, Wallet } from 'lucide-react';
import {
  MONTH_KEYS,
  MONTH_LABELS,
  QUARTERS,
  SEMESTERS,
  PeriodType,
  getMonthAmount,
  getMonthConsumption,
  getPeriodMonths,
  getPeriodLabel,
  formatSoles,
  formatNumber
} from '../recordUtils';

interface ChartsSectionProps {
  utilityType: UtilityType;
  records: SupplyRecord[];
  onShowToast: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

const PERIOD_OPTIONS: { key: PeriodType; label: string }[] = [
  { key: 'monthly', label: 'Mensual' },
  { key: 'quarterly', label: 'Trimestral' },
  { key: 'semiannual', label: 'Semestral' },
  { key: 'annual', label: 'Anual' }
];

export const ChartsSection: React.FC<ChartsSectionProps> = ({ utilityType, records, onShowToast }) => {
  const [openMenu, setOpenMenu] = useState<'evolution' | 'top' | null>(null);
  const [periodType, setPeriodType] = useState<PeriodType>('annual');
  const [periodIndex, setPeriodIndex] = useState<number>(0);

  const unitLabel = utilityType === 'energy' ? 'kW-h' : 'm³';
  const barColor = utilityType === 'energy' ? 'bg-[#004ac6] hover:bg-blue-700' : 'bg-[#00687a] hover:bg-teal-700';
  const accentText = utilityType === 'energy' ? 'text-[#004ac6]' : 'text-[#00687a]';
  const activeBtn = utilityType === 'energy' ? 'bg-[#004ac6] text-white shadow-sm' : 'bg-[#00687a] text-white shadow-sm';

  // Gasto REAL en soles por mes (Monto Facturado de cada recibo)
  const monthlyTotals = MONTH_KEYS.map(m => records.reduce((sum, r) => sum + getMonthAmount(r, m), 0));
  const monthlyConsumption = MONTH_KEYS.map(m => records.reduce((sum, r) => sum + (getMonthConsumption(r, m) || 0), 0));

  // Meses del período elegido (períodos fijos de calendario)
  const periodMonths = getPeriodMonths(periodType, periodIndex);
  const periodLabel = getPeriodLabel(periodType, periodIndex);
  const periodIdx = periodMonths.map(m => MONTH_KEYS.indexOf(m));

  const periodTotal = periodIdx.reduce((sum, i) => sum + monthlyTotals[i], 0);
  const periodConsumption = periodIdx.reduce((sum, i) => sum + monthlyConsumption[i], 0);
  const periodMonthsWithData = periodIdx.filter(i => monthlyTotals[i] > 0).length;
  const periodAverage = periodMonthsWithData > 0 ? periodTotal / periodMonthsWithData : 0;
  const periodSupplies = records.filter(r => periodMonths.some(m => getMonthAmount(r, m) > 0)).length;

  // En "Mensual" se ven los 12 meses con el mes elegido resaltado; en los demás, solo los meses del período
  const barsIdx = periodType === 'monthly' ? MONTH_KEYS.map((_, i) => i) : periodIdx;
  const maxVal = Math.max(...barsIdx.map(i => monthlyTotals[i]), 1);

  // Top de predios por gasto dentro del período elegido
  const topProperties = records
    .map(r => ({
      name: r.propertyName || r.address || 'S/N',
      total: periodMonths.reduce((acc, m) => acc + getMonthAmount(r, m), 0)
    }))
    .filter(p => p.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const topMax = Math.max(...topProperties.map(p => p.total), 1);

  const changePeriodType = (type: PeriodType) => {
    setPeriodType(type);
    setPeriodIndex(0);
  };

  const subOptions: { index: number; label: string }[] =
    periodType === 'monthly'
      ? MONTH_KEYS.map((m, i) => ({ index: i, label: MONTH_LABELS[m] }))
      : periodType === 'quarterly'
        ? QUARTERS.map((q, i) => ({ index: i, label: `T${i + 1}: ${MONTH_LABELS[q[0]]}-${MONTH_LABELS[q[2]]}` }))
        : periodType === 'semiannual'
          ? SEMESTERS.map((s, i) => ({ index: i, label: `S${i + 1}: ${MONTH_LABELS[s[0]]}-${MONTH_LABELS[s[5]]}` }))
          : [];

  // Descarga CSV/Excel del período activo
  const handleDownloadExcel = (chartTitle: string, typeData: 'evolution' | 'top') => {
    setOpenMenu(null);
    let headers: string[] = [];
    let rows: string[][] = [];

    if (typeData === 'evolution') {
      headers = ['Mes', 'Gasto Total Facturado (S/)', `Consumo (${unitLabel})`];
      rows = periodIdx.map(i => [MONTH_LABELS[MONTH_KEYS[i]], monthlyTotals[i].toFixed(2), monthlyConsumption[i].toFixed(2)]);
      rows.push([`TOTAL ${periodLabel}`, periodTotal.toFixed(2), periodConsumption.toFixed(2)]);
    } else {
      headers = ['N°', 'Predio / Sede', `Gasto ${periodLabel} (S/)`];
      rows = topProperties.map((p, idx) => [(idx + 1).toString(), `"${p.name}"`, p.total.toFixed(2)]);
    }

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_${chartTitle.replace(/\s+/g, '_')}_${periodLabel.replace(/[^A-Za-z0-9]+/g, '_')}_${utilityType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast('Exportación Exitosa', `Los datos de "${chartTitle}" (${periodLabel}) se descargaron en formato Excel/CSV.`, 'success');
  };

  // Compartir por correo el resumen del período activo
  const handleShareEmail = (chartTitle: string) => {
    setOpenMenu(null);
    const utilityName = utilityType === 'energy' ? 'Energía Eléctrica' : 'Agua Potable';
    const subject = encodeURIComponent(`Reporte Técnico: ${chartTitle} - ${utilityName} - ${periodLabel}`);

    let bodyText = `Estimado equipo técnico,\n\nSe comparte el resumen consolidado de ${utilityName} (${chartTitle}) - Período: ${periodLabel}:\n`;
    if (chartTitle.includes('Gasto')) {
      bodyText += `- Gasto del período: ${formatSoles(periodTotal)}\n- Promedio por mes con datos: ${formatSoles(periodAverage)}\n- Consumo del período: ${formatNumber(periodConsumption)} ${unitLabel}\n`;
      periodIdx.forEach(i => {
        bodyText += `  ${MONTH_LABELS[MONTH_KEYS[i]]}: ${formatSoles(monthlyTotals[i])}\n`;
      });
    } else {
      bodyText += topProperties.map((p, i) => `${i + 1}. ${p.name}: ${formatSoles(p.total)}`).join('\n');
    }
    bodyText += `\n\nGenerado desde el sistema de control de suministros.`;

    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
    onShowToast('Correo Preparado', 'Se abrió su cliente de correo para enviar los datos a los técnicos.', 'info');
  };

  const handleCopyLink = (chartName: string) => {
    setOpenMenu(null);
    navigator.clipboard.writeText(window.location.href);
    onShowToast('Enlace Copiado', `Enlace de vista de ${chartName} copiado al portapapeles.`, 'info');
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Selector de Período + Tarjetas KPI */}
      <div className="bg-white rounded-xl border border-[#cbd5e1] p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-[#191c1e] text-base flex items-center gap-2">
            <CalendarRange className={`w-4 h-4 ${accentText}`} />
            Gasto por Período
          </h3>
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs self-start lg:self-auto">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => changePeriodType(opt.key)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  periodType === opt.key ? activeBtn : 'text-[#434655] hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {subOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {subOptions.map(opt => (
              <button
                key={opt.index}
                onClick={() => setPeriodIndex(opt.index)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  periodIndex === opt.index ? activeBtn : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className={`rounded-xl p-4 text-white ${utilityType === 'energy' ? 'bg-[#004ac6]' : 'bg-[#00687a]'}`}>
            <p className="text-[11px] uppercase font-semibold opacity-80 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Gasto del período
            </p>
            <p className="text-xl font-bold mt-1">{formatSoles(periodTotal)}</p>
            <p className="text-[11px] opacity-80 mt-0.5">{periodLabel}</p>
          </div>
          <div className="rounded-xl p-4 border border-[#cbd5e1] bg-slate-50">
            <p className="text-[11px] uppercase font-semibold text-[#434655]">Consumo del período</p>
            <p className="text-xl font-bold mt-1 text-[#191c1e]">{formatNumber(periodConsumption)} {unitLabel}</p>
            <p className="text-[11px] text-[#434655] mt-0.5">Según lecturas registradas</p>
          </div>
          <div className="rounded-xl p-4 border border-[#cbd5e1] bg-slate-50">
            <p className="text-[11px] uppercase font-semibold text-[#434655]">Promedio mensual</p>
            <p className="text-xl font-bold mt-1 text-[#191c1e]">{formatSoles(periodAverage)}</p>
            <p className="text-[11px] text-[#434655] mt-0.5">{periodMonthsWithData} de {periodMonths.length} mes(es) con datos</p>
          </div>
          <div className="rounded-xl p-4 border border-[#cbd5e1] bg-slate-50">
            <p className="text-[11px] uppercase font-semibold text-[#434655]">Suministros facturados</p>
            <p className="text-xl font-bold mt-1 text-[#191c1e]">{periodSupplies}</p>
            <p className="text-[11px] text-[#434655] mt-0.5">De {records.length} registrados</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Gráfico 1: Evolución de Gasto en soles */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#cbd5e1] p-5 shadow-sm flex flex-col justify-between relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#191c1e] text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#004ac6]" />
                Evolución Mensual de Gasto (S/)
              </h3>
              <p className="text-xs text-[#434655]">
                Monto facturado real — {periodType === 'monthly' ? `12 meses, resaltado: ${periodLabel}` : periodLabel}
              </p>
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
                  <button onClick={() => handleDownloadExcel('Evolucion_Gasto', 'evolution')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Descargar en Excel
                  </button>
                  <button onClick={() => handleShareEmail('Evolución de Gasto')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                    <Mail className="w-3.5 h-3.5 text-blue-600" /> Compartir por Correo
                  </button>
                  <button onClick={() => handleCopyLink('Evolución de Gasto')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                    <Share2 className="w-3.5 h-3.5 text-slate-600" /> Copiar Enlace
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="h-44 flex items-end justify-between gap-1 pt-6 px-2 border-b border-slate-100 pb-2">
            {barsIdx.map(i => {
              const val = monthlyTotals[i];
              const heightPercent = Math.round((val / maxVal) * 100);
              const highlighted = periodType !== 'monthly' || i === periodIdx[0];
              return (
                <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-800 text-white text-[10px] py-0.5 px-1.5 rounded transition-opacity whitespace-nowrap z-10 shadow">
                    {formatSoles(val)}
                  </div>
                  <div
                    style={{ height: val > 0 ? `${Math.max(heightPercent, 4)}%` : '2px' }}
                    className={`w-full max-w-[28px] rounded-t transition-all ${val > 0 ? barColor : 'bg-slate-200'} ${highlighted ? '' : 'opacity-30'}`}
                  />
                  <span className={`text-[10px] mt-2 ${highlighted ? 'font-bold text-[#191c1e]' : 'font-semibold text-[#434655]'}`}>
                    {MONTH_LABELS[MONTH_KEYS[i]]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-3 text-xs text-[#434655]">
            <span>Promedio mensual del período: <strong>{formatSoles(periodAverage)}</strong></span>
            <span>Gasto del período: <strong>{formatSoles(periodTotal)}</strong></span>
          </div>
        </div>

        {/* Gráfico 2: Top de Gasto por Predio */}
        <div className="bg-white rounded-xl border border-[#cbd5e1] p-5 shadow-sm flex flex-col justify-between relative">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-[#191c1e] text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#004ac6]" />
                Top Gasto por Predio
              </h3>
              <p className="text-xs text-[#434655]">Sedes con mayor facturación — {periodLabel}</p>
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
                  <button onClick={() => handleDownloadExcel('Top_Gasto_Predios', 'top')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Descargar en Excel
                  </button>
                  <button onClick={() => handleShareEmail('Top de Gasto por Predio')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                    <Mail className="w-3.5 h-3.5 text-blue-600" /> Compartir por Correo
                  </button>
                  <button onClick={() => handleCopyLink('Top Gasto')} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                    <Share2 className="w-3.5 h-3.5 text-slate-600" /> Copiar Enlace
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 my-2 flex-1 justify-center">
            {topProperties.length === 0 ? (
              <p className="text-xs text-center text-slate-400 py-6">No hay montos facturados en este período.</p>
            ) : (
              topProperties.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-semibold text-[#191c1e]">
                    <span className="truncate max-w-[180px]" title={item.name}>{idx + 1}. {item.name}</span>
                    <span>{formatSoles(item.total)}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${utilityType === 'energy' ? 'bg-[#004ac6]' : 'bg-[#00687a]'}`}
                      style={{ width: `${Math.min(100, Math.max(5, (item.total / topMax) * 100))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <span className="text-[11px] text-[#434655] pt-2 border-t border-slate-100">
            Mostrando hasta 5 sedes con mayor gasto.
          </span>
        </div>
      </div>
    </div>
  );
};
