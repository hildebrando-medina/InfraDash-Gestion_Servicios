import React, { useState } from 'react';
import { SupplyRecord, UtilityType, UserRole, FilterState } from '../types';
import { Search, Filter, Download, Plus, Edit2, Trash2, Receipt, Eye, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { MONTH_NAMES } from '../data/mockData';

interface DataTableSectionProps {
  utilityType: UtilityType;
  role: UserRole;
  records: SupplyRecord[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onOpenNewModal: () => void;
  onOpenEditModal: (record: SupplyRecord) => void;
  onOpenDeleteModal: (record: SupplyRecord) => void;
  onOpenReceiptModal: (record: SupplyRecord) => void;
  onOpenFilterModal: () => void;
  onShowToast: (title: string, message: string, type: 'info' | 'success') => void;
}

export const DataTableSection: React.FC<DataTableSectionProps> = ({
  utilityType,
  role,
  records,
  filters,
  setFilters,
  onOpenNewModal,
  onOpenEditModal,
  onOpenDeleteModal,
  onOpenReceiptModal,
  onOpenFilterModal,
  onShowToast
}) => {
  const isEnergy = utilityType === 'energy';
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Filter records based on filters state
  const filteredRecords = records.filter((rec) => {
    // Search query match
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      const matchSupply = rec.supplyNumber.toLowerCase().includes(q);
      const matchProp = rec.propertyName.toLowerCase().includes(q);
      const matchAddr = rec.address.toLowerCase().includes(q);
      const matchRec = rec.receiptNumber.toLowerCase().includes(q);
      if (!matchSupply && !matchProp && !matchAddr && !matchRec) return false;
    }

    // Year filter
    if (filters.year !== 'all' && rec.year !== filters.year) {
      return false;
    }

    // Debt filter
    if (filters.debtFilter === 'with_debt' && rec.debtMonths === 0) {
      return false;
    }
    if (filters.debtFilter === 'no_debt' && rec.debtMonths > 0) {
      return false;
    }

    // Status filter
    if (filters.statusFilter !== 'all' && rec.status !== filters.statusFilter) {
      return false;
    }

    // Category filter
    if (filters.categoryFilter !== 'all' && rec.category !== filters.categoryFilter) {
      return false;
    }

    return true;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + pageSize);

  // Active filters count
  const activeFiltersCount = 
    (filters.year !== 'all' ? 1 : 0) +
    (filters.debtFilter !== 'all' ? 1 : 0) +
    (filters.statusFilter !== 'all' ? 1 : 0) +
    (filters.categoryFilter !== 'all' ? 1 : 0);

  // Excel / CSV Export
  const handleExportExcel = () => {
    const headers = [
      'Año',
      'N° Suministro',
      'Nombre del Predio',
      'Dirección',
      'Categoría',
      'N° Recibo',
      'Meses Deuda',
      'Ene (S/.)',
      'Feb (S/.)',
      'Mar (S/.)',
      'Abr (S/.)',
      'May (S/.)',
      'Jun (S/.)',
      'Total Facturado (S/.)',
      'Estado'
    ];

    const rows = filteredRecords.map(r => [
      r.year,
      `"${r.supplyNumber}"`,
      `"${r.propertyName}"`,
      `"${r.address}"`,
      `"${r.category}"`,
      `"${r.receiptNumber}"`,
      r.debtMonths,
      r.months.ene || 0,
      r.months.feb || 0,
      r.months.mar || 0,
      r.months.abr || 0,
      r.months.may || 0,
      r.months.jun || 0,
      r.totalAmount,
      r.status === 'active' ? 'Activo' : 'Inactivo'
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `InfraDash_${utilityType.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast('Exportación Exitosa', `Se han exportado ${filteredRecords.length} registros a archivo Excel (CSV).`, 'success');
  };

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-xs overflow-hidden flex flex-col">
      {/* Top Table Control Bar */}
      <div className="p-4 sm:p-5 border-b border-[#e2e8f0] bg-[#f8fafc] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-base text-[#191c1e] flex items-center gap-2">
            <span>{isEnergy ? 'Detalle de Consumo por Suministro' : 'Detalle de Consumo Hídrico'}</span>
            <span className="text-xs font-normal text-[#434655] px-2 py-0.5 bg-[#eceef0] rounded-full">
              {filteredRecords.length} registros
            </span>
          </h3>
          <p className="text-xs text-[#737686] mt-0.5">
            Registro mensual de facturación y estado de cuentas
          </p>
        </div>

        {/* Search, Filter & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737686]" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Buscar suministro o predio..."
              className="w-full bg-white border border-[#cbd5e1] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#191c1e] focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6] outline-none transition-colors"
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ ...filters, search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#737686] hover:text-[#191c1e]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters Button */}
          <button
            onClick={onOpenFilterModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              activeFiltersCount > 0
                ? 'bg-[#dbe1ff] border-[#004ac6] text-[#004ac6]'
                : 'bg-white border-[#cbd5e1] text-[#434655] hover:bg-[#f2f4f6]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 bg-[#004ac6] text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#004ac6] text-white rounded-lg text-xs font-semibold hover:bg-[#003ea8] shadow-2xs transition-colors"
            title="Exportar a Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar a Excel</span>
          </button>

          {/* New Record Button (Admin Only) */}
          {role === 'admin' && (
            <button
              onClick={onOpenNewModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#004ac6] text-[#004ac6] hover:bg-[#dbe1ff]/30 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Registro</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container with Sticky Header */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="text-[11px] font-semibold tracking-wider text-[#434655] uppercase bg-[#f8fafc] border-b border-[#e2e8f0]">
              <th className="py-2.5 px-3 sticky left-0 bg-[#f8fafc] z-10">Año</th>
              <th className="py-2.5 px-3">Suministro</th>
              <th className="py-2.5 px-3 min-w-[220px]">Predio/Dirección</th>
              <th className="py-2.5 px-3 text-center">Meses Deuda</th>
              <th className="py-2.5 px-3">N° Recibo</th>
              <th className="py-2.5 px-3 text-right font-mono-data">Ene</th>
              <th className="py-2.5 px-3 text-right font-mono-data">Feb</th>
              <th className="py-2.5 px-3 text-right font-mono-data">Mar</th>
              <th className="py-2.5 px-3 text-right font-mono-data">Abr</th>
              <th className="py-2.5 px-3 text-right font-mono-data">May</th>
              <th className="py-2.5 px-3 text-right font-mono-data bg-[#f2f4f6]">Total S/.</th>
              <th className="py-2.5 px-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="text-xs text-[#191c1e] divide-y divide-[#e2e8f0]/60">
            {paginatedRecords.length > 0 ? (
              paginatedRecords.map((rec) => {
                const hasDebt = rec.debtMonths > 0;

                return (
                  <tr
                    key={rec.id}
                    className="hover:bg-[#f1f5f9] transition-colors group"
                  >
                    {/* Año */}
                    <td className="py-2.5 px-3 font-medium sticky left-0 bg-white group-hover:bg-[#f1f5f9] z-10">
                      {rec.year}
                    </td>

                    {/* Suministro */}
                    <td className="py-2.5 px-3 font-mono-data font-semibold text-[#004ac6]">
                      {rec.supplyNumber}
                    </td>

                    {/* Predio/Dirección */}
                    <td className="py-2.5 px-3 max-w-[260px]">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#191c1e] truncate">{rec.propertyName}</span>
                        <span className="text-[11px] text-[#737686] truncate">{rec.address}</span>
                      </div>
                    </td>

                    {/* Meses Deuda */}
                    <td className="py-2.5 px-3 text-center">
                      {hasDebt ? (
                        <span 
                          className="inline-block px-2.5 py-0.5 rounded font-mono-data font-bold text-[11px] bg-[#ffdad6] text-[#ba1a1a]"
                          title={`${rec.debtMonths} meses con recibo pendiente de pago`}
                        >
                          {rec.debtMonths}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded font-mono-data text-[11px] bg-[#eceef0] text-[#434655]">
                          0
                        </span>
                      )}
                    </td>

                    {/* N° Recibo */}
                    <td className="py-2.5 px-3 font-mono-data">
                      {hasDebt ? (
                        <span className="text-[#ba1a1a] font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 inline" />
                          <span>Pendiente</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => onOpenReceiptModal(rec)}
                          className="text-[#434655] hover:text-[#004ac6] hover:underline"
                        >
                          {rec.receiptNumber}
                        </button>
                      )}
                    </td>

                    {/* Monthly amounts */}
                    <td className="py-2.5 px-3 text-right font-mono-data text-[#434655]">
                      {rec.months.ene ? rec.months.ene.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-data text-[#434655]">
                      {rec.months.feb ? rec.months.feb.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-data text-[#434655]">
                      {rec.months.mar ? rec.months.mar.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono-data ${hasDebt ? 'text-[#ba1a1a] font-semibold' : 'text-[#434655]'}`}>
                      {rec.months.abr ? rec.months.abr.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono-data ${hasDebt ? 'text-[#ba1a1a] font-semibold' : 'text-[#434655]'}`}>
                      {rec.months.may ? rec.months.may.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                    </td>

                    {/* Total S/. */}
                    <td className="py-2.5 px-3 text-right font-mono-data font-bold text-[#004ac6] bg-[#f2f4f6]">
                      {rec.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* View Receipt */}
                        <button
                          onClick={() => onOpenReceiptModal(rec)}
                          className="p-1 text-[#737686] hover:text-[#004ac6] hover:bg-[#dbe1ff]/30 rounded transition-colors"
                          title="Ver Recibo Electrónico"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>

                        {/* Admin only actions */}
                        {role === 'admin' ? (
                          <>
                            <button
                              onClick={() => onOpenEditModal(rec)}
                              className="p-1 text-[#737686] hover:text-[#004ac6] hover:bg-[#dbe1ff]/30 rounded transition-colors"
                              title="Editar Registro"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onOpenDeleteModal(rec)}
                              className="p-1 text-[#737686] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded transition-colors"
                              title="Eliminar Suministro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-[#737686] italic">Solo lectura</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={12} className="py-8 text-center text-[#737686]">
                  <p className="font-semibold text-sm">No se encontraron suministros</p>
                  <p className="text-xs mt-1">Intente cambiando los términos de búsqueda o limpiando los filtros.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 sm:px-5 border-t border-[#e2e8f0] bg-[#f8fafc] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#434655]">
        <div>
          <span>
            Mostrando <strong className="text-[#191c1e]">{filteredRecords.length > 0 ? startIndex + 1 : 0}</strong> a{' '}
            <strong className="text-[#191c1e]">{Math.min(startIndex + pageSize, filteredRecords.length)}</strong> de{' '}
            <strong className="text-[#191c1e]">{filteredRecords.length}</strong> registros
            {filteredRecords.length < 142 && ` (filtrado de 142 total)`}
          </span>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={safePage <= 1}
            className="p-1.5 rounded-md border border-[#cbd5e1] bg-white text-[#434655] hover:bg-[#eceef0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Página Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 font-semibold text-[#191c1e] bg-white border border-[#cbd5e1] rounded-md">
            {safePage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={safePage >= totalPages}
            className="p-1.5 rounded-md border border-[#cbd5e1] bg-white text-[#434655] hover:bg-[#eceef0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Página Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
