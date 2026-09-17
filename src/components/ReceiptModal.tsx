import React from 'react';
import { X, Printer, Download, Zap, Droplet, Building2, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { SupplyRecord, UtilityType } from '../types';

interface ReceiptModalProps {
  record: SupplyRecord | null;
  utilityType: UtilityType;
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  record,
  utilityType,
  isOpen,
  onClose,
  onShowToast
}) => {
  if (!isOpen || !record) return null;

  const isEnergy = utilityType === 'energy';
  const unitLabel = isEnergy ? 'kWh' : 'm³';

  // Sincronización y cálculo de lecturas y consumo
  const prevReading = (record as any).previousReading ?? 0;
  const currReading = (record as any).currentReading ?? 0;
  const calculatedConsumption = currReading >= prevReading ? currReading - prevReading : (record.consumption ?? 0);

  // Tarifas oficiales: 3.71 para energía y 0.85 para agua
  const defaultRate = isEnergy ? 3.71 : 0.85; 
  const unitRate = (record as any).unitRate || defaultRate;
  
  const totalAmount = record.totalAmount && record.totalAmount > 0 
    ? record.totalAmount 
    : calculatedConsumption * unitRate;

  const formatCurrency = (val: number) => {
    return `S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handlePrint = () => {
    window.print();
    if (onShowToast) {
      onShowToast('Impresión', 'Enviando recibo a impresora...', 'info');
    }
  };

  const handleDownloadPDF = () => {
    if (onShowToast) {
      onShowToast('Descarga', `Recibo del suministro ${record.supplyNumber} preparado con éxito.`, 'success');
    } else {
      alert(`Descargando recibo del suministro: ${record.supplyNumber}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera del Modal */}
        <div className={`p-5 flex items-center justify-between text-white ${isEnergy ? 'bg-gradient-to-r from-blue-700 to-blue-900' : 'bg-gradient-to-r from-cyan-600 to-teal-700'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md">
              {isEnergy ? <Zap className="w-6 h-6 text-yellow-300" /> : <Droplet className="w-6 h-6 text-cyan-200" />}
            </div>
            <div>
              <h3 className="text-base font-bold">
                Recibo Detallado de {isEnergy ? 'Energía Eléctrica' : 'Agua Potable'}
              </h3>
              <p className="text-xs text-white/80">
                Suministro N°: <span className="font-mono font-semibold">{record.supplyNumber}</span>
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

        {/* Cuerpo del Recibo */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-gray-700 text-xs">
          
          {/* Información General del Predio */}
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
                {record.category || 'General'} {(record as any).location ? `- ${(record as any).location}` : ''}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5 uppercase tracking-wider text-[10px] font-bold">N° de Medidor / Suministro</span>
              <span className="font-mono font-semibold text-gray-800">{(record as any).meterNumber || record.supplyNumber}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5 uppercase tracking-wider text-[10px] font-bold">N° de Comprobante / Recibo</span>
              <span className="font-mono font-bold text-blue-600">{record.receiptNumber || 'S/N'}</span>
            </div>
          </div>

          {/* Bloque de Lecturas y Consumo Sincronizado */}
          <div className="border border-blue-100 bg-blue-50/30 rounded-xl p-4">
            <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Detalle de Lecturas y Metraje Sincronizado</span>
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-2xs">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Lectura Anterior</span>
                <span className="font-mono font-bold text-gray-800 text-sm">{prevReading.toLocaleString('es-PE')}</span>
                <span className="text-[10px] text-gray-400 block">{unitLabel}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-2xs">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Lectura Actual</span>
                <span className="font-mono font-bold text-blue-600 text-sm">{currReading.toLocaleString('es-PE')}</span>
                <span className="text-[10px] text-gray-400 block">{unitLabel}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-2xs bg-blue-50/50">
                <span className="text-blue-700 block text-[10px] uppercase font-bold">Consumo Calculado</span>
                <span className="font-mono font-black text-blue-900 text-base">{calculatedConsumption.toLocaleString('es-PE')}</span>
                <span className="text-[10px] text-blue-600 block font-semibold">{unitLabel}</span>
              </div>
            </div>
          </div>

          {/* Desglose Financiero y Tarifas */}
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500">Tarifa Aplicada ({unitLabel}):</span>
              <span className="font-mono font-semibold text-gray-800">S/ {unitRate.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-500">Subtotal de Consumo:</span>
              <span className="font-mono font-semibold text-gray-800">{formatCurrency(calculatedConsumption * unitRate)}</span>
            </div>
            {record.debtMonths && record.debtMonths > 0 ? (
              <div className="flex justify-between items-center py-1 text-red-600 font-semibold bg-red-50 px-2 rounded">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Deuda acumulada ({record.debtMonths} meses):
                </span>
                <span className="font-mono">Meses pendientes en sistema</span>
              </div>
            ) : null}
            <div className="flex justify-between items-center py-3 border-t border-gray-200 text-sm">
              <span className="font-bold text-gray-900">Monto Total Facturado:</span>
              <span className="font-mono font-black text-blue-600 text-lg">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Estado de pago */}
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
            <span className="text-gray-500 font-semibold">Estado Actual:</span>
            {(record.debtMonths || 0) > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                <AlertTriangle className="w-3.5 h-3.5" /> Pendiente de Pago
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Al Día / Pagado
              </span>
            )}
          </div>

        </div>

        {/* Pie de Acciones */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
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