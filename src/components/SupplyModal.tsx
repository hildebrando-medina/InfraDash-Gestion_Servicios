import React, { useState, useEffect } from 'react';
import { SupplyRecord, UtilityType } from '../types';
import { X, Save, Zap, Droplet, FileText } from 'lucide-react';

interface SupplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: SupplyRecord) => void;
  recordToEdit: SupplyRecord | null;
  utilityType: UtilityType;
  onShowToast: (title: string, message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

const defaultMonthsData = {
  ene: { receipt: '', previousReading: 0, currentReading: 0, consumption: 0, amount: 0 },
  feb: { receipt: '', previousReading: 0, currentReading: 0, consumption: 0, amount: 0 },
  mar: { receipt: '', previousReading: 0, currentReading: 0, consumption: 0, amount: 0 },
  abr: { receipt: '', previousReading: 0, currentReading: 0, consumption: 0, amount: 0 },
  may: { receipt: '', previousReading: 0, currentReading: 0, consumption: 0, amount: 0 },
  jun: { receipt: '', previousReading: 0, currentReading: 0, consumption: 0, amount: 0 },
  jul: { receipt: '', previousReading: 0, currentReading: 0, consumption: 0, amount: 0 },
  ago: { receipt: '', previousReading: 0, currentReading: 0, consumption: 0, amount: 0 },
  set: { receipt: '', previousReading: 0, currentReading: 0, consumption: 0, amount: 0 },
  oct: { receipt: '', previousReading: 0, currentReading: 0, consumption: 0, amount: 0 },
  nov: { receipt: '', previousReading: 0, currentReading: 0, consumption: 0, amount: 0 },
  dic: { receipt: '', previousReading: 0, currentReading: 0, consumption: 0, amount: 0 }
};

export function SupplyModal({ isOpen, onClose, onSave, recordToEdit, utilityType, onShowToast }: SupplyModalProps) {
  const [activeTabMonth, setActiveTabMonth] = useState<string>('ene');
  const [formData, setFormData] = useState<any>({
    utilityType,
    supplyNumber: '',
    propertyName: '',
    address: '',
    category: 'Talara',
    year: 2026,
    monthlyDetails: JSON.parse(JSON.stringify(defaultMonthsData)),
    status: 'active'
  });

  useEffect(() => {
    if (recordToEdit) {
      // Aseguramos que si el registro previo no tiene monthlyDetails, se inicialice correctamente con los valores existentes
      const clonedMonthlyDetails = recordToEdit.monthlyDetails 
        ? JSON.parse(JSON.stringify(recordToEdit.monthlyDetails))
        : JSON.parse(JSON.stringify(defaultMonthsData));

      setFormData({
        ...recordToEdit,
        monthlyDetails: clonedMonthlyDetails
      });
    } else {
      setFormData({
        utilityType,
        supplyNumber: '',
        propertyName: '',
        address: '',
        category: 'Talara',
        year: 2026,
        monthlyDetails: JSON.parse(JSON.stringify(defaultMonthsData)),
        status: 'active'
      });
    }
    setActiveTabMonth('ene');
  }, [recordToEdit, utilityType, isOpen]);

  if (!isOpen) return null;

  const handleMonthDetailChange = (field: string, value: any) => {
    const currentMonthData = formData.monthlyDetails?.[activeTabMonth] || { receipt: '', previousReading: 0, currentReading: 0, consumption: 0, amount: 0 };
    
    let updatedMonth = { ...currentMonthData, [field]: value };

    // Si cambian las lecturas, calculamos automáticamente el consumo físico de manera segura
    if (field === 'previousReading' || field === 'currentReading') {
      const prev = field === 'previousReading' ? parseFloat(value) || 0 : parseFloat(currentMonthData.previousReading) || 0;
      const curr = field === 'currentReading' ? parseFloat(value) || 0 : parseFloat(currentMonthData.currentReading) || 0;
      updatedMonth.consumption = Math.max(0, Number((curr - prev).toFixed(2)));
    }

    setFormData((prev: any) => ({
      ...prev,
      monthlyDetails: {
        ...prev.monthlyDetails,
        [activeTabMonth]: updatedMonth
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplyNumber || !formData.propertyName) {
      onShowToast('Campos incompletos', 'Por favor complete el número de suministro y la propiedad.', 'warning');
      return;
    }

    // Calculamos los totales anuales automáticamente para la tabla general y gráficos
    const monthlyDetails = formData.monthlyDetails || defaultMonthsData;
    let totalConsumption = 0;
    let totalAmount = 0;
    const simpleMonthsConsumption: any = {};
    const simpleMonthsAmount: any = {};

    Object.keys(monthlyDetails).forEach(m => {
      const mData = monthlyDetails[m];
      const cons = Number(mData.consumption) || 0;
      const amt = Number(mData.amount) || 0;
      totalConsumption += cons;
      totalAmount += amt;
      simpleMonthsConsumption[m] = cons;
      simpleMonthsAmount[m] = amt;
    });

    const recordToSave: SupplyRecord = {
      id: recordToEdit ? recordToEdit.id : Date.now().toString(),
      utilityType: formData.utilityType || utilityType,
      supplyNumber: formData.supplyNumber || '',
      propertyName: formData.propertyName || '',
      address: formData.address || '',
      category: formData.category || 'Talara',
      consumption: Number(totalConsumption.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      year: Number(formData.year) || 2026,
      months: simpleMonthsConsumption, // Compatible con gráficos y resúmenes globales
      monthlyDetails: monthlyDetails, // Detalle completo mes a mes
      status: formData.status || 'active'
    } as any;

    onSave(recordToSave);
    onShowToast('Éxito', recordToEdit ? 'Suministro actualizado correctamente.' : 'Suministro registrado correctamente.', 'success');
    onClose();
  };

  const currentMonthInfo = formData.monthlyDetails?.[activeTabMonth] || { receipt: '', previousReading: 0, currentReading: 0, consumption: 0, amount: 0 };
  const unitLabel = utilityType === 'energy' ? 'kW-h' : 'm³';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-8">
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {utilityType === 'energy' ? <Zap className="w-5 h-5 text-amber-400" /> : <Droplet className="w-5 h-5 text-cyan-400" />}
            <h2 className="font-bold text-sm">{recordToEdit ? 'Editar Suministro y Recibos' : 'Nuevo Suministro - Control por Recibo'}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-xs">
          {/* Datos Generales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nro. de Suministro</label>
              <input
                type="text"
                required
                value={formData.supplyNumber || ''}
                onChange={e => setFormData({ ...formData, supplyNumber: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500"
                placeholder="Ej. SUM-88412"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nombre de Propiedad / Sede</label>
              <input
                type="text"
                required
                value={formData.propertyName || ''}
                onChange={e => setFormData({ ...formData, propertyName: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500"
                placeholder="Ej. Punta Arenas 01"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Categoría / Zona</label>
              <input
                type="text"
                value={formData.category || ''}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500"
                placeholder="Ej. Talara"
              />
            </div>
          </div>

          {/* Selector de Meses */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" /> Ingrese Datos del Recibo por Mes Seleccionado:
            </label>
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              {Object.keys(defaultMonthsData).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setActiveTabMonth(m)}
                  className={`flex-1 min-w-[45px] py-1.5 text-center uppercase font-bold rounded-lg transition-all cursor-pointer ${
                    activeTabMonth === m ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Formulario Específico del Mes Activo */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">N° de Recibo ({activeTabMonth.toUpperCase()})</label>
              <input
                type="text"
                value={currentMonthInfo.receipt || ''}
                onChange={e => handleMonthDetailChange('receipt', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                placeholder="REC-2026-..."
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Lectura Anterior</label>
              <input
                type="number"
                step="0.01"
                value={currentMonthInfo.previousReading ?? 0}
                onChange={e => handleMonthDetailChange('previousReading', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Lectura Actual</label>
              <input
                type="number"
                step="0.01"
                value={currentMonthInfo.currentReading ?? 0}
                onChange={e => handleMonthDetailChange('currentReading', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Consumo ({unitLabel})</label>
              <input
                type="number"
                step="0.01"
                value={currentMonthInfo.consumption ?? 0}
                onChange={e => handleMonthDetailChange('consumption', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold text-blue-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Monto Facturado (S/)</label>
              <input
                type="number"
                step="0.01"
                value={currentMonthInfo.amount ?? 0}
                onChange={e => handleMonthDetailChange('amount', e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold text-emerald-700"
                placeholder="0.00"
              />
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