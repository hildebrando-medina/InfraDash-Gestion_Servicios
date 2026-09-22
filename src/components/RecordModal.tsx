import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { SupplyRecord, MonthlyValues, UtilityType } from '../types';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: SupplyRecord) => void;
  utilityType: UtilityType;
  editingRecord?: SupplyRecord | null;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  utilityType,
  editingRecord
}) => {
  const [formData, setFormData] = useState({
    year: 2026,
    supplyNumber: '',
    receiptNumber: '',
    propertyName: '',
    category: 'Oficinas Administrativas',
    selectedMonth: 'Agosto',
    previousReading: 0,
    currentReading: 0,
    consumption: 0,
    amount: 0,
    debtMonths: 0
  });

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        year: editingRecord.year || 2026,
        supplyNumber: editingRecord.supplyNumber || '',
        receiptNumber: editingRecord.receiptNumber || '',
        propertyName: editingRecord.propertyName || editingRecord.address || '',
        category: editingRecord.category || 'Oficinas Administrativas',
        selectedMonth: 'Agosto',
        previousReading: editingRecord.previousReading || 0,
        currentReading: editingRecord.currentReading || 0,
        consumption: editingRecord.consumption || 0,
        amount: editingRecord.amount || 0,
        debtMonths: editingRecord.debtMonths || 0
      });
    } else {
      setFormData({
        year: 2026,
        supplyNumber: '',
        receiptNumber: '',
        propertyName: '',
        category: 'Oficinas Administrativas',
        selectedMonth: 'Agosto',
        previousReading: 0,
        currentReading: 0,
        consumption: 0,
        amount: 0,
        debtMonths: 0
      });
    }
  }, [editingRecord, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'previousReading' || name === 'currentReading') {
      const prev = name === 'previousReading' ? Number(value) : formData.previousReading;
      const curr = name === 'currentReading' ? Number(value) : formData.currentReading;
      const calculatedConsumption = Math.max(0, curr - prev);
      
      setFormData(prevData => ({
        ...prevData,
        [name]: Number(value),
        consumption: calculatedConsumption
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const monthMap: Record<string, keyof MonthlyValues> = {
      'Enero': 'ene',
      'Febrero': 'feb',
      'Marzo': 'mar',
      'Abril': 'abr',
      'Mayo': 'may',
      'Junio': 'jun',
      'Julio': 'jul',
      'Agosto': 'ago',
      'Septiembre': 'set',
      'Octubre': 'oct',
      'Noviembre': 'nov',
      'Diciembre': 'dic'
    };

    const monthKey = monthMap[formData.selectedMonth] || 'ago';
    const montoFacturado = Number(formData.amount || 0);

    const currentMonths: MonthlyValues = editingRecord?.months ? { ...editingRecord.months } : {
      ene: 0, feb: 0, mar: 0, abr: 0, may: 0, jun: 0, jul: 0, ago: 0, set: 0, oct: 0, nov: 0, dic: 0
    };

    currentMonths[monthKey] = montoFacturado;

    const totalSoles = Object.values(currentMonths).reduce(
      (acc, val) => acc + (Number(val) || 0), 0
    );

    const recordToSave: SupplyRecord = {
      id: editingRecord?.id || Date.now().toString(),
      year: Number(formData.year) || 2026,
      supplyNumber: formData.supplyNumber.trim() || '',
      propertyName: formData.propertyName || '',
      address: formData.propertyName || '',
      debtMonths: Number(formData.debtMonths) || 0,
      receiptNumber: formData.receiptNumber || '',
      status: 'active',
      utilityType: utilityType,
      category: formData.category as any,
      months: currentMonths,
      totalAmount: totalSoles,
      previousReading: Number(formData.previousReading) || 0,
      currentReading: Number(formData.currentReading) || 0,
      consumption: Number(formData.consumption) || 0,
      amount: montoFacturado
    };

    onSave(recordToSave);
    onClose();
  };

  if (!isOpen) return null;

  const unitLabel = utilityType === 'energy' ? 'kWh' : 'm³';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-6">
          {editingRecord ? 'Editar Registro de Suministro' : 'Nuevo Registro de Suministro'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                N° Suministro
              </label>
              <input
                type="text"
                name="supplyNumber"
                value={formData.supplyNumber}
                onChange={handleChange}
                placeholder="Ej. 71155016"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                N° Recibo
              </label>
              <input
                type="text"
                name="receiptNumber"
                value={formData.receiptNumber}
                onChange={handleChange}
                placeholder="Ej. REC-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nombre Predio / Sede
              </label>
              <input
                type="text"
                name="propertyName"
                value={formData.propertyName}
                onChange={handleChange}
                placeholder="Ej. REFINERIA CER. CERCADO 2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Categoría / Ubicación
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="Oficinas Administrativas">Oficinas Administrativas</option>
                <option value="Talara">Talara</option>
                <option value="Talara Alta">Talara Alta</option>
                <option value="Organos">Órganos</option>
                <option value="Negritos">Negritos</option>
                <option value="Planta Refineria Talara">Planta Refinería Talara</option>
                <option value="Almacén">Almacén</option>
                <option value="Talleres">Talleres</option>
                <option value="Viviendas Punta Arenas">Viviendas Punta Arenas</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mes de Registro
              </label>
              <select
                name="selectedMonth"
                value={formData.selectedMonth}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
              >
                <option value="Enero">Enero</option>
                <option value="Febrero">Febrero</option>
                <option value="Marzo">Marzo</option>
                <option value="Abril">Abril</option>
                <option value="Mayo">Mayo</option>
                <option value="Junio">Junio</option>
                <option value="Julio">Julio</option>
                <option value="Agosto">Agosto</option>
                <option value="Septiembre">Septiembre</option>
                <option value="Octubre">Octubre</option>
                <option value="Noviembre">Noviembre</option>
                <option value="Diciembre">Diciembre</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Lectura Anterior (LECT_ANT)
              </label>
              <input
                type="number"
                name="previousReading"
                value={formData.previousReading}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                min="0"
                step="any"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Lectura Actual (LECT_ACT)
              </label>
              <input
                type="number"
                name="currentReading"
                value={formData.currentReading}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                min="0"
                step="any"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Consumo ({unitLabel})
              </label>
              <input
                type="number"
                name="consumption"
                value={formData.consumption}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold bg-white"
                min="0"
                step="any"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Monto Facturado (S/)
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
            >
              Guardar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};