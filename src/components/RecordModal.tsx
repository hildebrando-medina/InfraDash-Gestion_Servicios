import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { SupplyRecord } from '../types';
import { MONTH_NAMES } from '../data/mockData';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: SupplyRecord) => void;
  recordToEdit?: SupplyRecord | null;
  utilityType: 'energy' | 'water';
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  recordToEdit,
  utilityType,
}) => {
  const [formData, setFormData] = useState<Partial<SupplyRecord>>({
    year: 2026,
    supplyNumber: '',
    propertyName: '',
    category: 'Oficinas Administrativas',
  
  });

  useEffect(() => {
    if (recordToEdit) {
      setFormData(recordToEdit);
    } else {
      setFormData({
        year: 2026,
        supplyNumber: '',
        propertyName: '',
        category: 'Oficinas Administrativas',
    
      });
    }
  }, [recordToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as SupplyRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">
            {recordToEdit ? 'Editar Registro' : 'Nuevo Registro'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                N° Suministro
              </label>
              <input
                type="text"
                required
                value={formData.supplyNumber || ''}
                onChange={(e) => setFormData({ ...formData, supplyNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nombre Predio / Sede
              </label>
              <input
                type="text"
                required
                value={formData.propertyName || ''}
                onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Categoría
            </label>
            <select
              value={formData.category || 'Oficinas Administrativas'}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            >
              <option value="Sede Principal">Sede Principal</option>
              <option value="Planta Industrial">Planta Industrial</option>
              <option value="Oficinas Administrativas">Oficinas Administrativas</option>
              <option value="Taller / Mantenimiento">Taller / Mantenimiento</option>
              <option value="Almacén">Almacén</option>
              <option value="Estación de Servicios">Estación de Servicios</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              Guardar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};