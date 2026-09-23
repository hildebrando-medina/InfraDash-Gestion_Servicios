import React, { useState, useEffect } from 'react';
import { SupplyRecord, UtilityType } from '../types';
import { X, Save, Zap, Droplet } from 'lucide-react';

interface SupplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: SupplyRecord) => void;
  recordToEdit: SupplyRecord | null;
  utilityType: UtilityType;
  onShowToast: (title: string, message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const defaultMonths = {
  ene: 0, feb: 0, mar: 0, abr: 0, may: 0, jun: 0,
  jul: 0, ago: 0, set: 0, oct: 0, nov: 0, dic: 0
};

export function SupplyModal({ isOpen, onClose, onSave, recordToEdit, utilityType, onShowToast }: SupplyModalProps) {
  // Usamos 'any' para evitar conflictos estrictos con las propiedades de types.ts
  const [formData, setFormData] = useState<any>({
    utilityType,
    supplyNumber: '',
    propertyName: '',
    address: '',
    category: 'Talara',
    receiptNumber: '',
    consumption: 0,
    totalAmount: 0,
    year: 2026,
    months: { ...defaultMonths },
    debtMonths: [],
    status: 'active'
  });

  useEffect(() => {
    if (recordToEdit) {
      setFormData(recordToEdit);
    } else {
      setFormData({
        utilityType,
        supplyNumber: '',
        propertyName: '',
        address: '',
        category: 'Talara',
        receiptNumber: '',
        consumption: 0,
        totalAmount: 0,
        year: 2026,
        months: { ...defaultMonths },
        debtMonths: [],
        status: 'active'
      });
    }
  }, [recordToEdit, utilityType, isOpen]);

  if (!isOpen) return null;

  const handleMonthChange = (monthKey: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const currentMonths = { ...(formData.months || defaultMonths), [monthKey]: numValue };
    
    const totalConsumption = Object.values(currentMonths).reduce((acc: number, val: any) => acc + Number(val), 0);

    setFormData((prev: any) => ({
      ...prev,
      consumption: totalConsumption,
      months: currentMonths
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplyNumber || !formData.propertyName) {
      onShowToast('Campos incompletos', 'Por favor complete el número de suministro y la propiedad.', 'warning');
      return;
    }

    const recordToSave: SupplyRecord = {
      id: recordToEdit ? recordToEdit.id : Date.now().toString(),
      utilityType: formData.utilityType || utilityType,
      supplyNumber: formData.supplyNumber || '',
      propertyName: formData.propertyName || '',
      address: formData.address || '',
      category: formData.category || 'Talara',
      receiptNumber: formData.receiptNumber || '',
      consumption: Number(formData.consumption) || 0,
      totalAmount: Number(formData.totalAmount) || 0,
      year: Number(formData.year) || 2026,
      months: formData.months || { ...defaultMonths },
      debtMonths: formData.debtMonths || [],
      status: formData.status || 'active'
    } as any;

    onSave(recordToSave);
    onShowToast('Éxito', recordToEdit ? 'Suministro actualizado correctamente.' : 'Suministro registrado correctamente.', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-scale-up my-8">
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {utilityType === 'energy' ? <Zap className="w-5 h-5 text-amber-400" /> : <Droplet className="w-5 h-5 text-cyan-400" />}
            <h2 className="font-bold text-sm">{recordToEdit ? 'Editar Suministro' : 'Nuevo Suministro'}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nro. de Suministro</label>
              <input
                type="text"
                required
                value={formData.supplyNumber || ''}
                onChange={e => setFormData({ ...formData, supplyNumber: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej. SUM-88412"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nombre de Propiedad / Vivienda</label>
              <input
                type="text"
                required
                value={formData.propertyName || ''}
                onChange={e => setFormData({ ...formData, propertyName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej. Punta Arenas 01"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Categoría / Zona</label>
              <input
                type="text"
                value={formData.category || ''}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej. Talara"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Monto Total ($ o S/)</label>
              <input
                type="number"
                step="0.01"
                value={formData.totalAmount || 0}
                onChange={e => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Consumo Total Acumulado</label>
              <input
                type="number"
                disabled
                value={formData.consumption || 0}
                className="w-full bg-slate-200 border border-slate-300 rounded-lg px-3 py-2 text-slate-600 font-bold cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-2">Consumo por los 12 Meses</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {Object.keys(defaultMonths).map(m => (
                <div key={m}>
                  <label className="block uppercase text-[10px] font-bold text-slate-500 mb-0.5">{m}</label>
                  <input
                    type="number"
                    value={formData.months?.[m] || 0}
                    onChange={e => handleMonthChange(m, e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" /> Guardar Suministro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}