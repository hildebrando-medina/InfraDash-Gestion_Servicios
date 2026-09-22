import React, { useState } from 'react';
import { Eye, Edit2, Trash2, Search, Filter, AlertCircle, Plus, FileSpreadsheet, Calendar } from 'lucide-react';
import { SupplyRecord, UtilityType, UserRole, FilterState } from '../types';

interface DataTableSectionProps {
  records: SupplyRecord[];
  utilityType: UtilityType;
  role?: UserRole;
  filters?: FilterState;
  setFilters?: React.Dispatch<React.SetStateAction<FilterState>>;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onOpenEditModal?: (record: SupplyRecord) => void;
  onOpenDeleteModal?: (record: SupplyRecord) => void;
  onOpenReceiptModal?: (record: SupplyRecord) => void;
  onOpenFilterModal?: () => void;
  onOpenNewModal?: () => void;
  [key: string]: any;
}

type ActiveMonthView = 'all' | 'jul' | 'ago' | 'set' | 'oct' | 'nov' | 'dic';

export const DataTableSection: React.FC<DataTableSectionProps> = ({
  records,
  utilityType,
  role,
  filters,
  setFilters,
  onShowToast,
  onOpenEditModal,
  onOpenDeleteModal,
  onOpenReceiptModal,
  onOpenFilterModal,
  onOpenNewModal
}) => {
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const [localCategory, setLocalCategory] = useState('ALL');
  const [selectedMonthView, setSelectedMonthView] = useState<ActiveMonthView>('all');

  const unitLabel = utilityType === 'energy' ? 'kW-h' : 'm³';

  // Filtrado de registros
  const filteredRecords = records.filter((record: SupplyRecord) => {
    const matchesUtility = record.utilityType === utilityType;
    const searchTerm = (filters?.search || localSearch).toLowerCase();
    
    const matchesSearch = 
      record.supplyNumber.toLowerCase().includes(searchTerm) ||
      record.propertyName.toLowerCase().includes(searchTerm) ||
      (record.receiptNumber && record.receiptNumber.toLowerCase().includes(searchTerm));
    
    const matchesCategory = localCategory === 'ALL' || record.category === localCategory;

    return matchesUtility && matchesSearch && matchesCategory;
  });

  // Paginación
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return '-';
    return `S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Función para exportar a Excel
  const handleExportToExcel = () => {
    if (filteredRecords.length === 0) {
      if (onShowToast) {
        onShowToast('Exportación', 'No hay registros para exportar con los filtros actuales.', 'warning');
      } else {
        alert('No hay registros para exportar con los filtros actuales.');
      }
      return;
    }

    const headers = [
      'Nro Suministro', 'Predio / Sede', 'Categoria', 'Nro Recibo', 
      `Consumo (${unitLabel})`, 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic', 'Total Facturado'
    ];
    
    const rows = filteredRecords.map(r => [
      r.supplyNumber,
      `"${r.propertyName || r.address || ''}"`,
      `"${r.category || ''}"`,
      r.receiptNumber || 'S/N',
      r.consumption || 0,
      r.months?.jul || 0,
      r.months?.ago || 0,
      r.months?.set || 0,
      r.months?.oct || 0,
      r.months?.nov || 0,
      r.months?.dic || 0,
      r.totalAmount || 0
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_${utilityType === 'energy' ? 'Energia_Electrica' : 'Agua_Potable'}_2026_S2.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) {
      onShowToast('Éxito', 'Los datos se han exportado a Excel correctamente.', 'success');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
      {/* Encabezado y Controles */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Registros de {utilityType === 'energy' ? 'Energía Eléctrica' : 'Agua Potable'} (2do Semestre)
          </h2>
          <p className="text-xs text-gray-500">
            Mostrando {filteredRecords.length} suministros registrados en el sistema
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Búsqueda */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar suministro, predio..."
              value={filters?.search ?? localSearch}
              onChange={(e) => {
                const val = e.target.value;
                setLocalSearch(val);
                if (setFilters && filters) {
                  setFilters({ ...filters, search: val });
                }
              }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Botón Filtro Avanzado */}
          {onOpenFilterModal && (
            <button
              onClick={onOpenFilterModal}
              className="px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Filter className="w-4 h-4 text-gray-500" />
              <span>Filtros</span>
            </button>
          )}

          {/* Botón Exportar a Excel */}
          <button
            onClick={handleExportToExcel}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            title="Exportar registros filtrados a Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>

          {/* Botón Nuevo Registro */}
          {onOpenNewModal && role === 'admin' && (
            <button
              onClick={onOpenNewModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Suministro</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Enfoque por Mes (Control visual agregado para mayor claridad) */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 overflow-x-auto">
        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1 mr-2">
          <Calendar className="w-3.5 h-3.5 text-blue-600" /> Enfocar Vista:
        </span>
        {[
          { key: 'all', label: 'Todos los Meses' },
          { key: 'jul', label: 'Julio' },
          { key: 'ago', label: 'Agosto' },
          { key: 'set', label: 'Setiembre' },
          { key: 'oct', label: 'Octubre' },
          { key: 'nov', label: 'Noviembre' },
          { key: 'dic', label: 'Diciembre' }
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setSelectedMonthView(m.key as ActiveMonthView)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              selectedMonthView === m.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Tabla Principal */}
      <div className="overflow-x-auto border border-gray-100 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
              <th className="p-3 text-center border-r border-gray-200">N° SUMINISTRO</th>
              <th className="p-3 border-r border-gray-200 min-w-[200px]">NOMBRE PREDIO / SEDE</th>
              <th className="p-3 border-r border-gray-200">CATEGORÍA</th>
              <th className="p-3 text-center border-r border-gray-200">N° RECIBO</th>
              <th className="p-3 text-center border-r border-gray-200">CONSUMO ({unitLabel})</th>
              
              {/* Columnas dinámicas según el foco de mes */}
              <th colSpan={selectedMonthView === 'all' ? 6 : 1} className="p-3 text-center border-r border-gray-200 bg-blue-50/50 text-blue-900 font-bold">
                {selectedMonthView === 'all' ? 'DETALLE DE CONSUMOS JUL - DIC (S/)' : `MONTO FACTURADO - ${selectedMonthView.toUpperCase()}`}
              </th>
              
              <th className="p-3 text-right border-r border-gray-200">TOTAL FACTURADO</th>
              <th className="p-3 text-center">ACCIONES</th>
            </tr>

            {selectedMonthView === 'all' && (
              <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <th className="p-2 border-r border-gray-200"></th>
                <th className="p-2 border-r border-gray-200"></th>
                <th className="p-2 border-r border-gray-200"></th>
                <th className="p-2 border-r border-gray-200"></th>
                <th className="p-2 border-r border-gray-200"></th>

                <th className="p-2 text-right border-r border-gray-100 w-20">JUL</th>
                <th className="p-2 text-right border-r border-gray-100 w-20">AGO</th>
                <th className="p-2 text-right border-r border-gray-100 w-20">SET</th>
                <th className="p-2 text-right border-r border-gray-100 w-20">OCT</th>
                <th className="p-2 text-right border-r border-gray-100 w-20">NOV</th>
                <th className="p-2 text-right border-r border-gray-200 w-20">DIC</th>

                <th className="p-2 border-r border-gray-200"></th>
                <th className="p-2"></th>
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-gray-100 text-gray-700">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={13} className="p-8 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-8 h-8 text-gray-300" />
                    <p>No se encontraron registros para esta selección.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((record: SupplyRecord) => (
                <tr key={record.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-3 font-mono font-medium text-gray-900 text-center border-r border-gray-100">
                    {record.supplyNumber}
                  </td>
                  <td className="p-3 font-semibold text-gray-800 border-r border-gray-100">
                    {record.propertyName || record.address}
                  </td>
                  <td className="p-3 text-gray-600 border-r border-gray-100">
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[11px] font-medium">
                      {record.category}
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono text-gray-600 border-r border-gray-100">
                    {record.receiptNumber || 'S/N'}
                  </td>
                  <td className="p-3 text-center font-bold text-blue-600 border-r border-gray-100">
                    {record.consumption ? `${record.consumption} ${unitLabel}` : '-'}
                  </td>

                  {/* Renderizado condicional de celdas según el filtro de mes seleccionado */}
                  {selectedMonthView === 'all' ? (
                    <>
                      <td className="p-3 text-right font-mono border-r border-gray-100 text-gray-600">
                        {record.months?.jul !== undefined ? formatCurrency(record.months.jul) : '-'}
                      </td>
                      <td className="p-3 text-right font-mono border-r border-gray-100 text-gray-600">
                        {record.months?.ago !== undefined ? formatCurrency(record.months.ago) : '-'}
                      </td>
                      <td className="p-3 text-right font-mono border-r border-gray-100 text-gray-600">
                        {record.months?.set !== undefined ? formatCurrency(record.months.set) : '-'}
                      </td>
                      <td className="p-3 text-right font-mono border-r border-gray-100 text-gray-600">
                        {record.months?.oct !== undefined ? formatCurrency(record.months.oct) : '-'}
                      </td>
                      <td className="p-3 text-right font-mono border-r border-gray-100 text-gray-600">
                        {record.months?.nov !== undefined ? formatCurrency(record.months.nov) : '-'}
                      </td>
                      <td className="p-3 text-right font-mono border-r border-gray-200 text-gray-600">
                        {record.months?.dic !== undefined ? formatCurrency(record.months.dic) : '-'}
                      </td>
                    </>
                  ) : (
                    <td className="p-3 text-right font-mono font-bold text-blue-700 border-r border-gray-200 bg-blue-50/20">
                      {formatCurrency(record.months?.[selectedMonthView as keyof typeof record.months])}
                    </td>
                  )}

                  <td className="p-3 text-right font-bold text-gray-900 border-r border-gray-100">
                    {formatCurrency(record.totalAmount)}
                  </td>

                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {onOpenReceiptModal && (
                        <button
                          onClick={() => onOpenReceiptModal(record)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Ver Recibo Detallado"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      {onOpenEditModal && role === 'admin' && (
                        <button
                          onClick={() => onOpenEditModal(record)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar Suministro"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      {onOpenDeleteModal && role === 'admin' && (
                        <button
                          onClick={() => onOpenDeleteModal(record)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar Suministro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>Mostrar</span>
          <select
            value={itemsPerPage}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>registros por página</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev: number) => Math.max(1, prev - 1))}
            className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Anterior
          </button>
          <span className="font-medium text-gray-700">
            Página {currentPage} de {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev: number) => Math.min(totalPages, prev + 1))}
            className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};