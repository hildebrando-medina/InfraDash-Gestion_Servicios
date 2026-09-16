import React from 'react';
import { X, Printer } from 'lucide-react';
import { SupplyRecord } from '../types';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SupplyRecord | null;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  record,
  onShowToast
}) => {
  if (!isOpen || !record) return null;

  const isEnergy = record.utilityType === 'energy';
  const unitLabel = isEnergy ? 'kW-h' : 'm³';

  // Lista de meses semestrales para la tabla de desglose
  const semesterMonths = [
    { key: 'ene', label: 'ENE' },
    { key: 'feb', label: 'FEB' },
    { key: 'mar', label: 'MARZ' },
    { key: 'abr', label: 'ABR' },
    { key: 'may', label: 'MAY' },
    { key: 'jun', label: 'JUN' }
  ];

  // Cálculo del total acumulado en el semestre
  const totalSemestral = semesterMonths.reduce((sum, m) => {
    const val = record.months?.[m.key as keyof typeof record.months] || 0;
    return sum + Number(val);
  }, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
        {/* Botón de Cierre */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Encabezado del Recibo */}
        <div className="border-b border-gray-200 pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Detalle de Recibo de Serv. {isEnergy ? 'Eléctrico' : 'de Agua'}
              </h2>
              <p className="text-sm text-gray-500">
                N° Recibo: <span className="font-semibold text-gray-800">{record.receiptNumber || 'S/N'}</span>
              </p>
            </div>
            <div className="flex gap-2 mr-8">
              <button
                onClick={() => window.print()}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-gray-200 transition-colors"
                title="Imprimir Recibo"
              >
                <Printer className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Datos Principales y Lecturas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm">
          <div className="space-y-2">
            <div>
              <span className="text-xs text-gray-500 font-bold uppercase block">Predio / Dirección</span>
              <p className="font-bold text-gray-800 text-base">{record.propertyName || record.address}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-bold uppercase block">Categoría / Ubicación</span>
              <p className="text-gray-700 font-medium">{record.category}</p>
            </div>
          </div>

          <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-gray-200 pt-3 md:pt-0 md:pl-4">
            <p className="flex justify-between">
              <span className="text-gray-500">N° Suministro:</span>
              <strong className="text-gray-900">{record.supplyNumber}</strong>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-500">CONSUMO ({unitLabel}):</span>
              <strong className="text-blue-600">{record.consumption || 0}</strong>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-500">LECT_ANT (Lectura Anterior):</span>
              <strong className="text-gray-800">{record.previousReading || 0}</strong>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-500">LECT_ACT (Lectura Actual):</span>
              <strong className="text-gray-800">{record.currentReading || 0}</strong>
            </p>
          </div>
        </div>

        {/* Desglose Semestral de Facturación (3 Columnas) */}
        <div className="mt-4">
          <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">
            Desglose Semestral de Facturación
          </h3>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700 border-b border-gray-200">
                  <th className="p-3 border-r border-gray-200 font-bold">MESES</th>
                  <th className="p-3 border-r border-gray-200 font-bold text-center">LECT-ACT (Lectura Actual)</th>
                  <th className="p-3 font-bold text-right">MONTOS FACTURADOS (S/)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {semesterMonths.map((m) => {
                  const montoMes = record.months?.[m.key as keyof typeof record.months] || 0;
                  return (
                    <tr key={m.key} className="hover:bg-gray-50 transition-colors">
                      <td className="p-2.5 font-semibold text-gray-700 border-r border-gray-200">{m.label}</td>
                      <td className="p-2.5 text-center text-gray-600 border-r border-gray-200">
                        {record.currentReading || 0}
                      </td>
                      <td className="p-2.5 text-right font-medium text-gray-900">
                        S/ {Number(montoMes).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {/* Fila del Total */}
                <tr className="bg-blue-50/50 font-bold text-gray-900 border-t-2 border-gray-300">
                  <td className="p-3 border-r border-gray-200 text-blue-900">TOTAL</td>
                  <td className="p-3 text-center border-r border-gray-200 text-gray-400">-</td>
                  <td className="p-3 text-right text-blue-700 text-base">
                    S/ {totalSemestral.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Botón de cierre inferior */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};