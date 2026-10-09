import React from 'react';
import { X, Printer, Download, Zap, Droplet, Building2, FileText, CheckCircle2, AlertTriangle, Calendar, BarChart3, TrendingUp } from 'lucide-react';
import { ColumnChart, LineChart } from './ConsumptionCharts';
import { buildReceiptPdf, receiptPdfFileName } from '../receiptPdf';
import { SupplyRecord, UtilityType } from '../types';
import {
  MONTH_FULL_NAMES,
  isMonthKey,
  MonthKey,
  hasMonthlyDetails,
  getMonthAmount,
  getMonthConsumption,
  getMonthReceipt,
  getLatestMonthWithData,
  MONTH_KEYS,
  MONTH_LABELS,
  formatNumber
} from '../recordUtils';

interface ReceiptModalProps {
  record: SupplyRecord | null;
  utilityType: UtilityType;
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  activeMonthView?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  record,
  utilityType,
  isOpen,
  onClose,
  onShowToast,
  activeMonthView = 'all'
}) => {
  if (!isOpen || !record) return null;

  const recordUtility: UtilityType = (record.utilityType || utilityType) as UtilityType;
  const isEnergy = recordUtility === 'energy';
  const unitLabel = isEnergy ? 'kWh' : 'm³';

  // Mes del recibo: el elegido en la tabla; si es "Año Completo", el último mes con datos
  let selectedMonth: MonthKey = 'jul';
  const fromRecord = (record as any).selectedMonth;
  if (isMonthKey(fromRecord)) {
    selectedMonth = fromRecord;
  } else if (isMonthKey(activeMonthView)) {
    selectedMonth = activeMonthView;
  } else {
    selectedMonth = getLatestMonthWithData(record) || 'jul';
  }

  const displayMonthName = MONTH_FULL_NAMES[selectedMonth];

  // Datos REALES del mes, leídos del detalle mensual (monthlyDetails)
  const detail: any = hasMonthlyDetails(record) ? (record.monthlyDetails?.[selectedMonth] || {}) : null;
  const prevReading = detail ? Number(detail.previousReading) || 0 : 0;
  const currReading = detail ? Number(detail.currentReading) || 0 : 0;
  const monthConsumption = getMonthConsumption(record, selectedMonth);
  const effectiveAmount = getMonthAmount(record, selectedMonth);
  const monthReceipt = getMonthReceipt(record, selectedMonth) || (!hasMonthlyDetails(record) ? record.receiptNumber : '') || 'S/N';

  const formatCurrency = (val: number): string => {
    return `S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handlePrint = () => {
    window.print();
    if (onShowToast) {
      onShowToast('Impresión', 'Enviando recibo a impresora...', 'info');
    }
  };

  // Consumo de ESTE predio en los 12 meses (para los gráficos)
  const monthLabels = MONTH_KEYS.map(m => MONTH_LABELS[m]);
  const monthlyConsumption = MONTH_KEYS.map(m => getMonthConsumption(record, m) || 0);
  const selectedIndex = MONTH_KEYS.indexOf(selectedMonth);
  const annualConsumption = monthlyConsumption.reduce((a, b) => a + b, 0);
  const monthsWithReadings = monthlyConsumption.filter(v => v > 0).length;
  // Monto en soles por mes y meses con recibo registrado (aunque el consumo sea 0)
  const monthlyAmounts = MONTH_KEYS.map(m => getMonthAmount(record, m));
  const monthsPresent = MONTH_KEYS.map((m, i) => monthlyAmounts[i] > 0 || monthlyConsumption[i] > 0 || getMonthReceipt(record, m) !== '');
  const annualAmount = monthlyAmounts.reduce((a, b) => a + b, 0);
  // Meses con monto facturado pero sin consumo registrado (para revisar con el recibo físico)
  // Predio sin consumo en ningún mes (solo montos): el aviso "Revisar" se muestra en una sola línea
  const noConsumptionAtAll = annualConsumption <= 0 && annualAmount > 0;
  const monthsMissingConsumption = MONTH_KEYS.filter((m, i) => monthlyAmounts[i] > 0 && monthlyConsumption[i] <= 0).map(m => MONTH_LABELS[m]);
  const chartColor = isEnergy ? '#1d4ed8' : '#0e7490';
  const recordYear = Number(record.year) || 2026;

  // Descarga REAL del recibo en PDF (con los dos gráficos)
  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const pdfData = {
        isEnergy,
        supplyNumber: record.supplyNumber || '',
        propertyName: record.propertyName || record.address || '',
        category: record.category || '',
        receiptNumber: monthReceipt,
        monthName: displayMonthName,
        year: recordYear,
        unitLabel,
        prevReading: detail ? prevReading : null,
        currReading: detail ? currReading : null,
        consumption: monthConsumption,
        amount: effectiveAmount,
        debtMonths: Number(record.debtMonths) || 0,
        monthLabels,
        monthlyConsumption,
        monthlyAmounts,
        monthsPresent,
        selectedIndex
      };
      const doc = buildReceiptPdf(jsPDF, pdfData);
      doc.save(receiptPdfFileName(pdfData));
      onShowToast?.('PDF descargado', `Recibo del suministro ${record.supplyNumber} (${displayMonthName}) guardado en Descargas.`, 'success');
    } catch (e) {
      console.error('Error al generar el PDF:', e);
      onShowToast?.('No se pudo generar el PDF', 'Use el botón "Imprimir" y elija "Guardar como PDF".', 'error');
    }
  };

  return (
    <div className="receipt-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div id="receipt-print" className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        <div className={`p-5 flex items-center justify-between text-white ${isEnergy ? 'bg-gradient-to-r from-blue-700 to-blue-900' : 'bg-gradient-to-r from-cyan-600 to-teal-700'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md">
              {isEnergy ? <Zap className="w-6 h-6 text-yellow-300" /> : <Droplet className="w-6 h-6 text-cyan-200" />}
            </div>
            <div>
              <h3 className="text-base font-bold">
                Recibo Detallado de {isEnergy ? 'Energía Eléctrica' : 'Agua Potable'}
              </h3>
              <p className="text-xs text-white/80 flex items-center gap-2 mt-0.5">
                <span>Suministro N°: <strong className="font-mono">{record.supplyNumber}</strong></span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-[11px] font-semibold">
                  <Calendar className="w-3 h-3" /> Periodo: {displayMonthName} {(record as any).year || 2026}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="receipt-body p-6 space-y-5 max-h-[75vh] overflow-y-auto text-gray-700 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <span className="text-gray-400 block mb-0.5 uppercase tracking-wider text-[10px] font-bold">Predio / Sede</span>
              <span className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                {record.propertyName || record.address || 'No especificado'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5 uppercase tracking-wider text-[10px] font-bold">Categoría / Ubicación</span>
              <span className="font-semibold text-gray-700">
                {record.category || 'General'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5 uppercase tracking-wider text-[10px] font-bold">N° de Medidor / Suministro</span>
              <span className="font-mono font-semibold text-gray-800">{(record as any).meterId || record.supplyNumber}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5 uppercase tracking-wider text-[10px] font-bold">N° de Comprobante / Recibo</span>
              <span className="font-mono font-bold text-blue-600">{monthReceipt}</span>
            </div>
          </div>

          <div className="border border-blue-100 bg-blue-50/30 rounded-xl p-4">
            <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Consumo Registrado para el mes de {displayMonthName}</span>
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-2xs">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Lectura Anterior</span>
                <span className="font-mono font-bold text-gray-800 text-sm">{prevReading > 0 ? prevReading.toLocaleString('es-PE') : '---'}</span>
                <span className="text-[10px] text-gray-400 block">{unitLabel}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-2xs">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Lectura Actual</span>
                <span className="font-mono font-bold text-blue-600 text-sm">{currReading > 0 ? currReading.toLocaleString('es-PE') : '---'}</span>
                <span className="text-[10px] text-gray-400 block">{unitLabel}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-2xs bg-blue-50/50">
                <span className="text-blue-700 block text-[10px] uppercase font-bold">Consumo del Periodo</span>
                <span className="font-mono font-black text-blue-900 text-base">{monthConsumption !== null && monthConsumption > 0 ? monthConsumption.toLocaleString('es-PE') : '—'}</span>
                <span className="text-[10px] text-blue-600 block font-semibold">{unitLabel}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-gray-100 pt-4">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500 font-medium">Concepto de Facturación ({displayMonthName}):</span>
              <span className="font-mono font-semibold text-gray-800">Servicio de {isEnergy ? 'Energía Eléctrica' : 'Agua Potable'}</span>
            </div>
            
            {Number(record.debtMonths) > 0 ? (
              <div className="flex justify-between items-center py-1 text-red-600 font-semibold bg-red-50 px-2 rounded">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Deuda acumulada:
                </span>
                <span className="font-mono">{record.debtMonths} mes(es) pendientes</span>
              </div>
            ) : null}

            <div className="flex justify-between items-center py-3 border-t border-gray-200 text-sm bg-gray-50/80 px-3 rounded-xl">
              <span className="font-bold text-gray-900">Monto Total Facturado ({displayMonthName}):</span>
              <span className="font-mono font-black text-blue-600 text-lg">{effectiveAmount > 0 ? formatCurrency(effectiveAmount) : '—'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
            <span className="text-gray-500 font-semibold">Estado Actual del Recibo:</span>
            {Number(record.debtMonths) > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                <AlertTriangle className="w-3.5 h-3.5" /> Pendiente de Pago
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Al Día / Pagado
              </span>
            )}
          </div>

          {/* Gráficos de consumo de ESTE predio (Ene - Dic) */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-4 receipt-charts">
            <div>
              <h4 className={`font-bold text-[11px] uppercase flex items-center gap-1.5 mb-2 ${isEnergy ? 'text-blue-700' : 'text-cyan-700'}`}>
                <BarChart3 className="w-4 h-4" />
                <>Consumo mensual del predio <span className="normal-case">({unitLabel}) y monto facturado (S/)</span> – columnas</>
              </h4>
              <ColumnChart
                labels={monthLabels}
                values={monthlyConsumption}
                amounts={monthlyAmounts}
                color={chartColor}
                unit={unitLabel}
                highlightIndex={selectedIndex}
                height={210}
                emptyMessage="Sin recibos registrados para este predio."
              />
            </div>
            <div>
              <h4 className={`font-bold text-[11px] uppercase flex items-center gap-1.5 mb-2 ${isEnergy ? 'text-blue-700' : 'text-cyan-700'}`}>
                <TrendingUp className="w-4 h-4" />
                <>Evolución del consumo <span className="normal-case">({unitLabel}) y monto facturado (S/)</span> – líneas</>
              </h4>
              <LineChart
                labels={monthLabels}
                values={monthlyConsumption}
                amounts={monthlyAmounts}
                present={monthsPresent}
                color={chartColor}
                unit={unitLabel}
                highlightIndex={selectedIndex}
                height={190}
                emptyMessage="Sin recibos registrados para este predio."
              />
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-[11px] text-gray-600 border-t border-gray-100 pt-2">
              <span>Consumo anual registrado: <strong>{formatNumber(annualConsumption)} {unitLabel}</strong></span>
              <span>Promedio por mes con consumo: <strong>{monthsWithReadings > 0 ? formatNumber(annualConsumption / monthsWithReadings) : 0} {unitLabel}</strong></span>
              <span>Gasto anual registrado: <strong className="text-emerald-700">S/ {annualAmount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>
            {noConsumptionAtAll ? (
              <div className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
                <strong>Revisar:</strong> ningún mes tiene consumo registrado. Si los recibos indican consumo, regístrelo con el lápiz (escriba el consumo al final, sin tocar las lecturas).
              </div>
            ) : monthsMissingConsumption.length > 0 && (
              <div className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
                <strong>Revisar:</strong> {monthsMissingConsumption.join(', ')} tiene(n) monto en soles pero consumo 0. Si el recibo indica consumo, corríjalo con el lápiz (escriba el consumo al final, sin tocar las lecturas).
              </div>
            )}
          </div>

        </div>

        <div className="receipt-actions p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl font-semibold transition-colors cursor-pointer"
          >
            Cerrar Ventana
          </button>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-gray-500" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className={`flex-1 sm:flex-none px-4 py-2 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer ${isEnergy ? 'bg-blue-600 hover:bg-blue-700' : 'bg-cyan-600 hover:bg-cyan-700'}`}
            >
              <Download className="w-4 h-4" />
              <span>Descargar PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};