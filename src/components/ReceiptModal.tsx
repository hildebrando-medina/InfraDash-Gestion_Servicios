import React from 'react';
import { SupplyRecord, UtilityType } from '../types';
import { X, Printer, Download, CheckCircle, AlertTriangle, Building, Zap, Droplets, QrCode } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SupplyRecord | null;
  onShowToast: (title: string, message: string, type: 'info' | 'success') => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  record,
  onShowToast
}) => {
  if (!isOpen || !record) return null;

  const isEnergy = record.utilityType === 'energy';
  const subtotal = record.totalAmount / 1.18;
  const igv = record.totalAmount - subtotal;

  const handlePrint = () => {
    onShowToast('Impresión Enviada', `Preparando recibo ${record.receiptNumber} para impresión física / PDF.`, 'success');
  };

  const handleDownloadPDF = () => {
    onShowToast('Descarga Exitosa', `Documento digital ${record.receiptNumber}.pdf descargado correctamente.`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header toolbar */}
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#004ac6] text-[22px]">
              receipt_long
            </span>
            <div>
              <h2 className="text-base font-bold text-[#191c1e]">
                Detalle de Recibo de Servicio
              </h2>
              <span className="text-xs text-[#434655] font-mono-data">
                {record.receiptNumber} • Año {record.year}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-[#434655] hover:text-[#191c1e] hover:bg-[#eceef0] rounded-lg transition-colors"
              title="Imprimir Recibo"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadPDF}
              className="p-2 text-[#434655] hover:text-[#191c1e] hover:bg-[#eceef0] rounded-lg transition-colors"
              title="Descargar PDF"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#737686] hover:text-[#191c1e] hover:bg-[#eceef0] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Digital Bill Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Bill Top Banner */}
          <div className="border border-[#e2e8f0] rounded-xl p-4 bg-[#f8fafc] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#004ac6]">
                  {isEnergy ? 'Concesionaria Eléctrica Nacional' : 'Servicio de Agua Potable y Alcantarillado'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#dbe1ff] text-[#00174b] font-semibold">
                  RUC 20100128451
                </span>
              </div>
              <p className="text-sm font-bold text-[#191c1e]">
                RECIBO POR SERVICIOS PÚBLICOS - ELECTRÓNICO
              </p>
              <p className="text-xs text-[#434655]">
                Comprobante de Pago Regulado por OSINERGMIN / SUNASS
              </p>
            </div>

            <div className="text-right sm:border-l sm:border-[#cbd5e1] sm:pl-4">
              <span className="text-xs text-[#737686] block">N° de Comprobante</span>
              <span className="text-base font-bold font-mono-data text-[#004ac6]">
                {record.receiptNumber}
              </span>
              <div className="mt-1">
                {record.debtMonths > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ba1a1a] bg-[#ffdad6] px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" />
                    {record.debtMonths} Meses Pendientes
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] bg-[#ecfdf5] px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Comprobante Cancelado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Supply & Customer Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-[#e2e8f0] rounded-xl p-4">
            <div>
              <span className="text-[11px] font-semibold text-[#737686] uppercase block">
                Predio / Sede Registrada
              </span>
              <p className="text-sm font-bold text-[#191c1e] mt-0.5">{record.propertyName}</p>
              <p className="text-xs text-[#434655] mt-0.5">{record.address}</p>
              <p className="text-xs text-[#737686] mt-1">Categoría: {record.category}</p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#737686]">N° Suministro:</span>
                <span className="font-mono-data font-bold text-[#191c1e]">{record.supplyNumber}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#737686]">Medidor Físico:</span>
                <span className="font-mono-data text-[#191c1e]">{record.meterId || 'MED-AUTO-991'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#737686]">Opción Tarifaria:</span>
                <span className="text-[#191c1e] font-medium">{record.tariffType || 'Tarifa Comercial'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#737686]">Estado del Servicio:</span>
                <span className={`font-semibold ${record.status === 'active' ? 'text-[#059669]' : 'text-[#ba1a1a]'}`}>
                  {record.status === 'active' ? 'Activo / Con Suministro' : 'Inactivo / Suspendido'}
                </span>
              </div>
            </div>
          </div>

          {/* Monthly Breakdown Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#434655] mb-2">
              Desglose Semestral de Facturación
            </h4>
            <div className="border border-[#e2e8f0] rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f2f4f6] text-[#434655] font-semibold border-b border-[#e2e8f0]">
                  <tr>
                    <th className="p-2.5">Mes</th>
                    <th className="p-2.5 text-right">Lectura</th>
                    <th className="p-2.5 text-right">Monto Facturado</th>
                    <th className="p-2.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9] font-mono-data">
                  {Object.entries(record.months).slice(0, 6).map(([monthKey, val]) => {
                    const numVal = Number(val) || 0;
                    return (
                      <tr key={monthKey} className="hover:bg-[#f8fafc]">
                        <td className="p-2.5 font-medium uppercase">{monthKey} 2023</td>
                        <td className="p-2.5 text-right text-[#434655]">
                          {isEnergy ? `${Math.round(numVal * 1.8)} kWh` : `${Math.round(numVal * 0.32)} m³`}
                        </td>
                        <td className="p-2.5 text-right font-semibold text-[#191c1e]">
                          S/ {numVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-center font-sans">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ecfdf5] text-[#059669]">
                            Facturado
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals and QR Section */}
          <div className="border border-[#e2e8f0] rounded-xl p-4 bg-[#f8fafc] flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 text-xs text-[#434655]">
              <div className="w-16 h-16 bg-white border border-[#cbd5e1] rounded-lg flex items-center justify-center p-1">
                <QrCode className="w-12 h-12 text-[#191c1e]" />
              </div>
              <div>
                <p className="font-semibold text-[#191c1e]">Código de Verificación SUNAT</p>
                <p className="text-[11px] text-[#737686]">Hash: 8a9f-310e-bd29-c451</p>
                <p className="text-[10px] text-[#737686]">Consulte su validez en portal fiscal</p>
              </div>
            </div>

            <div className="w-full sm:w-60 space-y-1.5 text-xs">
              <div className="flex justify-between text-[#434655]">
                <span>Subtotal Base:</span>
                <span className="font-mono-data">S/ {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[#434655]">
                <span>I.G.V. (18%):</span>
                <span className="font-mono-data">S/ {igv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-1.5 border-t border-[#cbd5e1] flex justify-between font-bold text-sm text-[#004ac6]">
                <span>TOTAL A PAGAR:</span>
                <span className="font-mono-data">S/ {record.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#e2e8f0] bg-[#f8fafc] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#004ac6] text-white rounded-lg text-xs font-semibold hover:bg-[#003ea8] transition-colors"
          >
            Cerrar Visualizador
          </button>
        </div>
      </div>
    </div>
  );
};
