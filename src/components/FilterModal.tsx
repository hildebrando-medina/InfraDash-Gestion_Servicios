import React from 'react';
import { FilterState } from '../types';
import { X, Filter, RotateCcw, Check } from 'lucide-react';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onReset: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  setFilters,
  onReset
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#004ac6]" />
            <h2 className="text-base font-bold text-[#191c1e]">Filtros Avanzados</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#737686] hover:text-[#191c1e] hover:bg-[#e2e8f0] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Year */}
          <div>
            <label className="block text-xs font-semibold text-[#191c1e] mb-1.5">
              Año de Ejercicio Fiscal
            </label>
            <div className="grid grid-cols-5 gap-2">
              {['all', 2027, 2026, 2025, 2024].map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setFilters({ ...filters, year: yr as any })}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    filters.year === yr
                      ? 'bg-[#004ac6] text-white border-[#004ac6] shadow-2xs'
                      : 'bg-white text-[#434655] border-[#cbd5e1] hover:bg-[#f8fafc]'
                  }`}
                >
                  {yr === 'all' ? 'Todos' : yr}
                </button>
              ))}
            </div>
          </div>

          {/* Debt Status */}
          <div>
            <label className="block text-xs font-semibold text-[#191c1e] mb-1.5">
              Estado de Deuda / Morosidad
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'with_debt', label: 'Con Deuda' },
                { key: 'no_debt', label: 'Al Día' }
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilters({ ...filters, debtFilter: item.key as any })}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    filters.debtFilter === item.key
                      ? 'bg-[#004ac6] text-white border-[#004ac6] shadow-2xs'
                      : 'bg-white text-[#434655] border-[#cbd5e1] hover:bg-[#f8fafc]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Operational Status */}
          <div>
            <label className="block text-xs font-semibold text-[#191c1e] mb-1.5">
              Estado Operativo del Predio
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'active', label: 'Activos' },
                { key: 'inactive', label: 'Inactivos' }
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilters({ ...filters, statusFilter: item.key as any })}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    filters.statusFilter === item.key
                      ? 'bg-[#004ac6] text-white border-[#004ac6] shadow-2xs'
                      : 'bg-white text-[#434655] border-[#cbd5e1] hover:bg-[#f8fafc]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-semibold text-[#191c1e] mb-1.5">
              Categoría de Instalación
            </label>
            <select
              value={filters.categoryFilter}
              onChange={(e) => setFilters({ ...filters, categoryFilter: e.target.value })}
              className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-lg px-3 py-2 text-xs text-[#191c1e] focus:border-[#004ac6] focus:outline-none"
            >
              <option value="all">Todas las categorías</option>
              <option value="Talara">Talara</option>
              <option value="Talara Alta">Talara Alta</option>
              <option value="Órganos">Órganos</option>
              <option value="Negritos">Negritos</option>
              <option value="Planta Refineria Talara">Planta Refineria Talara</option>
              <option value="Almacén">Almacén</option>
              <option value="Oficinas Administrativas">Oficinas Administrativas</option>
              <option value="Talleres">Talleres</option>
              <option value="Viviendas Punta Arenas">Viviendas Punta Arenas</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-xs font-semibold text-[#737686] hover:text-[#ba1a1a] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar filtros</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#004ac6] text-white rounded-lg text-xs font-semibold hover:bg-[#003ea8] shadow-xs flex items-center gap-1 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Aplicar Filtros</span>
          </button>
        </div>
      </div>
    </div>
  );
};