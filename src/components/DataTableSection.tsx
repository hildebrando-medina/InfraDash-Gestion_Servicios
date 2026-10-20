import React, { useState } from 'react';
import { Eye, Edit2, Trash2, Search, Filter, AlertCircle, Plus, FileSpreadsheet, Calendar, Copy, X, Merge, ClipboardCheck, CheckCircle2, RotateCcw, FileText } from 'lucide-react';
import { ReportsModal } from './ReportsModal';
import { findCandidates, suggestedMonth, MES_TITULO } from '../reports';
import { SupplyRecord, UtilityType, UserRole, FilterState } from '../types';
import {
  MONTH_KEYS,
  MONTH_LABELS,
  MonthKey,
  getMonthAmount,
  getMonthConsumption,
  getMonthReceipt,
  getAnnualAmount,
  getAnnualConsumption,
  getLatestReceipt,
  monthHasData,
  findDuplicateGroups,
  mergeDuplicateGroup,
  formatNumber,
  findFillingIssues,
  REVIEW_REASONS,
  FillingIssue,
  MONTH_FULL_NAMES
} from '../recordUtils';

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

type ActiveMonthView = 'all' | 'ene' | 'feb' | 'mar' | 'abr' | 'may' | 'jun' | 'jul' | 'ago' | 'set' | 'oct' | 'nov' | 'dic';

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
  onOpenNewModal,
  onOpenEditFromDuplicates,
  onMergeDuplicates,
  onOpenEditAtMonth,
  onMarkIssueReviewed
}) => {
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [localSearch, setLocalSearch] = useState<string>('');
  const [localCategory] = useState<string>('ALL');
  const [selectedMonthView, setSelectedMonthView] = useState<ActiveMonthView>('all');
  const [showDuplicates, setShowDuplicates] = useState<boolean>(false);
  // Se recalcula en vivo: al unir o corregir copias, el panel se actualiza solo
  const duplicateGroups = showDuplicates ? findDuplicateGroups(records, utilityType) : null;
  // Revisar llenado: también se recalcula en vivo al corregir cada predio
  const [showFillingReview, setShowFillingReview] = useState<boolean>(false);
  const fillingReports = showFillingReview ? findFillingIssues(records, utilityType) : null;
  const activeReports = fillingReports ? fillingReports.filter(r => r.issues.length > 0) : null;
  const reviewedReports = fillingReports ? fillingReports.filter(r => r.reviewed.length > 0) : null;
  const reviewedCount = reviewedReports ? reviewedReports.reduce((n, r) => n + r.reviewed.length, 0) : 0;
  const [reasonsOpen, setReasonsOpen] = useState<string | null>(null); // aviso con la lista de motivos abierta
  const [showReviewed, setShowReviewed] = useState<boolean>(false);
  const [showReports, setShowReports] = useState<boolean>(false);
  // Aviso en el botón Reportes: ahorros y excesos significativos del último mes con recibos
  const reportMonth = suggestedMonth(records, utilityType);
  const reportCands = findCandidates(records, utilityType, reportMonth);
  const nAhorro = reportCands.filter(c => c.kind === 'ahorro').length;
  const nExceso = reportCands.filter(c => c.kind === 'exceso').length;
  const canMark = role === 'admin' && !!onMarkIssueReviewed;

  const unitLabel = utilityType === 'energy' ? 'kW-h' : 'm³';

  const filteredRecords = records.filter((record: SupplyRecord) => {
    const matchesUtility = record.utilityType === utilityType;
    const searchTerm = (filters?.search || localSearch).toLowerCase();
    
    const receipts = [record.receiptNumber || '', ...MONTH_KEYS.map(m => getMonthReceipt(record, m))].join(' ').toLowerCase();
    const matchesSearch =
      (record.supplyNumber || '').toString().toLowerCase().includes(searchTerm) ||
      (record.propertyName || record.address || '').toString().toLowerCase().includes(searchTerm) ||
      receipts.includes(searchTerm);
    
    const matchesCategory = localCategory === 'ALL' || record.category === localCategory;

    return matchesUtility && matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Muestra "—" cuando no hay monto real: nunca un número inventado
  const formatCurrency = (val: number | undefined | null): string => {
    if (val === undefined || val === null || isNaN(Number(val)) || Number(val) === 0) return '—';
    return `S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatConsumption = (val: number | null): string => {
    if (val === null || val === 0) return '—';
    return `${formatNumber(val)} ${unitLabel}`;
  };

  const handleDetectDuplicates = () => {
    const groups = findDuplicateGroups(records, utilityType);
    setShowDuplicates(groups.length > 0);
    if (groups.length === 0 && onShowToast) {
      onShowToast('Sin duplicados', `No se encontraron suministros repetidos en ${utilityType === 'energy' ? 'Energía' : 'Agua'}.`, 'success');
    }
  };

  const handleReviewFilling = () => {
    const reports = findFillingIssues(records, utilityType).filter(r => r.issues.length > 0);
    setShowFillingReview(true);
    if (reports.length === 0 && onShowToast) {
      onShowToast('Llenado correcto', `No se encontraron meses sospechosos en ${utilityType === 'energy' ? 'Energía' : 'Agua'}.`, 'success');
    }
  };

  const handleExportToExcel = () => {
    if (filteredRecords.length === 0) {
      if (onShowToast) {
        onShowToast('Exportación', 'No hay registros para exportar con los filtros actuales.', 'warning');
      } else {
        alert('No hay registros para exportar con los filtros actuales.');
      }
      return;
    }

    const isMonth = selectedMonthView !== 'all';
    const monthKey = selectedMonthView as MonthKey;

    const headers = isMonth
      ? ['Nro Suministro', 'Predio / Sede', 'Categoria', `Nro Recibo (${selectedMonthView.toUpperCase()})`, `Consumo ${selectedMonthView.toUpperCase()} (${unitLabel})`, `Monto ${selectedMonthView.toUpperCase()} (S/)`]
      : ['Nro Suministro', 'Predio / Sede', 'Categoria', 'Ultimo Nro Recibo', `Consumo Anual (${unitLabel})`, ...MONTH_KEYS.map(m => `${MONTH_LABELS[m]} (S/)`), 'Total Facturado (S/)'];

    const rows = filteredRecords.map(r => {
      const base = [
        r.supplyNumber,
        `"${r.propertyName || r.address || ''}"`,
        `"${r.category || ''}"`
      ];
      if (isMonth) {
        const cons = getMonthConsumption(r, monthKey);
        return [
          ...base,
          getMonthReceipt(r, monthKey) || '',
          cons === null ? '' : cons.toFixed(2),
          getMonthAmount(r, monthKey).toFixed(2)
        ];
      }
      const annualCons = getAnnualConsumption(r);
      return [
        ...base,
        getLatestReceipt(r) || '',
        annualCons === null ? '' : annualCons.toFixed(2),
        ...MONTH_KEYS.map(m => getMonthAmount(r, m).toFixed(2)),
        getAnnualAmount(r).toFixed(2)
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_${utilityType === 'energy' ? 'Energia_Electrica' : 'Agua_Potable'}_${selectedMonthView === 'all' ? 'Anual' : selectedMonthView.toUpperCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) {
      onShowToast('Éxito', 'Los datos se han exportado a Excel correctamente.', 'success');
    }
  };

  const monthsList: { key: ActiveMonthView; label: string }[] = [
    { key: 'all', label: 'Año Completo' },
    { key: 'ene', label: 'Ene' },
    { key: 'feb', label: 'Feb' },
    { key: 'mar', label: 'Mar' },
    { key: 'abr', label: 'Abr' },
    { key: 'may', label: 'May' },
    { key: 'jun', label: 'Jun' },
    { key: 'jul', label: 'Jul' },
    { key: 'ago', label: 'Ago' },
    { key: 'set', label: 'Set' },
    { key: 'oct', label: 'Oct' },
    { key: 'nov', label: 'Nov' },
    { key: 'dic', label: 'Dic' }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Registros de {utilityType === 'energy' ? 'Energía Eléctrica' : 'Agua Potable'}
          </h2>
          <p className="text-xs text-gray-500">
            Mostrando {filteredRecords.length} suministros registrados en el sistema
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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

          {onOpenFilterModal && (
            <button
              onClick={onOpenFilterModal}
              className="px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Filter className="w-4 h-4 text-gray-500" />
              <span>Filtros</span>
            </button>
          )}

          <button
            onClick={handleExportToExcel}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            title="Exportar registros filtrados a Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handleDetectDuplicates}
            className="px-3 py-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Buscar suministros registrados más de una vez"
          >
            <Copy className="w-4 h-4" />
            <span>Detectar Duplicados</span>
          </button>

          <button
            onClick={handleReviewFilling}
            className="px-3 py-2 border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Buscar meses que pudieron quedar mal llenados"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Revisar llenado</span>
          </button>

          <button
            onClick={() => setShowReports(true)}
            className="px-3 py-2 border border-violet-300 bg-violet-50 hover:bg-violet-100 text-violet-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title={`Memorandos de reconocimiento o advertencia e informe general en Word. ${MES_TITULO[reportMonth]}: ${nAhorro} con ahorro y ${nExceso} con exceso significativo.`}
            data-testid="btn-reportes"
          >
            <FileText className="w-4 h-4" />
            <span>Reportes</span>
            {nAhorro > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold" data-testid="badge-ahorro">
                {nAhorro} ahorro
              </span>
            )}
            {nExceso > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse" data-testid="badge-exceso">
                {nExceso} exceso
              </span>
            )}
          </button>

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

      {showReports && (
        <ReportsModal records={records} utilityType={utilityType} onClose={() => setShowReports(false)} onShowToast={onShowToast} />
      )}

      {activeReports && activeReports.length === 0 && (
        <div className="mb-4 bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-xs text-emerald-900 flex items-start justify-between gap-3" data-testid="revisar-ok">
          <div>
            <p className="font-bold text-sm">Revisar llenado: no se encontraron meses pendientes de revisar.</p>
            {reviewedCount > 0 && <p>{reviewedCount} aviso(s) ya fueron marcados como correctos (ver abajo).</p>}
          </div>
          <button onClick={() => setShowFillingReview(false)} className="p-1 rounded hover:bg-emerald-100 cursor-pointer" title="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeReports && activeReports.length > 0 && (
        <div className="mb-4 bg-orange-50 border border-orange-300 rounded-xl p-4 text-xs text-orange-950" data-testid="revisar-llenado">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-bold text-sm">Revisar llenado: {activeReports.length} suministro(s) con meses para revisar</p>
              <p>
                Tenga a mano el recibo físico. Si el dato está mal, presione <strong>Corregir</strong>: se abre ese suministro en el mes indicado.
                Si el aviso es correcto (por ejemplo, <strong>cambio de medidor</strong> o un <strong>recibo que aún no llega</strong>), presione{' '}
                <strong>"Está correcto"</strong> y elija el motivo: el aviso sale de la lista.
              </p>
            </div>
            <button onClick={() => setShowFillingReview(false)} className="p-1 rounded hover:bg-orange-100 cursor-pointer" title="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {activeReports.map(rep => (
              <div key={rep.record.id} className="bg-white border border-orange-200 rounded-lg p-3">
                <p className="font-bold mb-2">
                  <span className="font-mono">{rep.record.supplyNumber}</span> — {rep.record.propertyName || rep.record.address}
                </p>
                <div className="flex flex-col gap-1.5">
                  {rep.issues.map((iss: FillingIssue) => {
                    const openId = `${rep.record.id}|${iss.key}`;
                    return (
                      <div key={iss.key} className="border-t border-orange-100 pt-1.5" data-testid="aviso-pendiente">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex-1 min-w-[240px]">{iss.message}</span>
                          <div className="flex gap-2 shrink-0">
                            {canMark && (
                              <button
                                onClick={() => setReasonsOpen(reasonsOpen === openId ? null : openId)}
                                className="px-2 py-1 rounded border border-emerald-500 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-semibold flex items-center gap-1 cursor-pointer"
                                title="El dato está bien: quitar este aviso de la lista"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Está correcto
                              </button>
                            )}
                            {role === 'admin' && onOpenEditAtMonth && (
                              <button
                                onClick={() => onOpenEditAtMonth(rep.record, iss.month)}
                                className="px-2 py-1 rounded bg-orange-600 hover:bg-orange-700 text-white font-semibold flex items-center gap-1 cursor-pointer"
                                title={`Abrir ${MONTH_FULL_NAMES[iss.month]} con el lápiz`}
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Corregir {iss.month.toUpperCase()}
                              </button>
                            )}
                          </div>
                        </div>
                        {canMark && reasonsOpen === openId && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2" data-testid="motivos">
                            <span className="font-semibold text-emerald-900">¿Por qué está correcto?</span>
                            {REVIEW_REASONS[iss.type].map(reason => (
                              <button
                                key={reason}
                                onClick={() => {
                                  onMarkIssueReviewed(rep.record, iss.key, reason);
                                  setReasonsOpen(null);
                                }}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                              >
                                {reason}
                              </button>
                            ))}
                            <button onClick={() => setReasonsOpen(null)} className="px-2 py-1 rounded text-slate-600 hover:bg-slate-100 cursor-pointer">
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reviewedReports && reviewedCount > 0 && (
        <div className="mb-4 bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800" data-testid="avisos-revisados">
          <button onClick={() => setShowReviewed(!showReviewed)} className="font-semibold flex items-center gap-1.5 cursor-pointer hover:underline">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Avisos marcados como correctos: {reviewedCount} {showReviewed ? '(ocultar)' : '(ver)'}
          </button>
          {showReviewed && (
            <div className="mt-2 flex flex-col gap-1.5">
              {reviewedReports.map(rep =>
                rep.reviewed.map((iss: FillingIssue) => (
                  <div key={rep.record.id + iss.key} className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5" data-testid="aviso-revisado">
                    <span className="flex-1 min-w-[240px]">
                      <span className="font-mono font-semibold">{rep.record.supplyNumber}</span> — {MONTH_FULL_NAMES[iss.month]}:{' '}
                      <strong>{iss.reviewed?.reason}</strong>
                      {iss.reviewed?.at ? ` (marcado el ${new Date(iss.reviewed.at).toLocaleDateString('es-PE')})` : ''}
                    </span>
                    {canMark && (
                      <button
                        onClick={() => onMarkIssueReviewed(rep.record, iss.key, null)}
                        className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-100 font-semibold flex items-center gap-1 cursor-pointer"
                        title="Volver a mostrar este aviso en la lista"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Volver a mostrar
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {duplicateGroups && duplicateGroups.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-900">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-bold text-sm">Se encontraron {duplicateGroups.length} suministro(s) registrados más de una vez</p>
              <p>
                Presione "Unir copias": todos los meses quedan en un solo registro y las copias sobrantes se eliminan.
                Si dos copias tienen datos distintos en el mismo mes, el sistema no une nada y le indica qué mes revisar.
              </p>
            </div>
            <button onClick={() => setShowDuplicates(false)} className="p-1 rounded hover:bg-amber-100 cursor-pointer" title="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {duplicateGroups.map((group, gIdx) => (
              <div key={gIdx} className="bg-white border border-amber-200 rounded-lg p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="font-bold font-mono">Suministro {group[0].supplyNumber}</p>
                  {role === 'admin' && onMergeDuplicates && (
                    <button
                      onClick={() => {
                        const result = mergeDuplicateGroup(group);
                        if (result.conflicts.length > 0) {
                          const meses = result.conflicts.map(m => MONTH_LABELS[m]).join(', ');
                          if (onShowToast) {
                            onShowToast('No se unió', `Las copias tienen datos distintos en: ${meses}. Corrija ese mes con "Editar" y vuelva a intentar.`, 'warning');
                          }
                          return;
                        }
                        if (confirm(`¿Unir las ${group.length} copias del suministro ${group[0].supplyNumber} en un solo registro? Se conservan todos los meses.`)) {
                          onMergeDuplicates(result.merged, result.removeIds);
                        }
                      }}
                      className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Merge className="w-3.5 h-3.5" /> Unir copias
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  {group.map((rec, rIdx) => {
                    const monthsWithData = MONTH_KEYS.filter(m => monthHasData(rec, m)).map(m => MONTH_LABELS[m]);
                    return (
                      <div key={rec.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-100 pt-1.5">
                        <span>
                          Copia {rIdx + 1}: <strong>{rec.propertyName || rec.address}</strong> — meses con datos:{' '}
                          <strong>{monthsWithData.length > 0 ? monthsWithData.join(', ') : 'ninguno'}</strong>{' '}
                          — total {formatCurrency(getAnnualAmount(rec))}
                        </span>
                        {role === 'admin' && onOpenEditFromDuplicates && (
                          <button
                            onClick={() => onOpenEditFromDuplicates(rec)}
                            className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Editar copia {rIdx + 1}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-gray-100 overflow-x-auto">
        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1 mr-2 shrink-0">
          <Calendar className="w-3.5 h-3.5 text-blue-600" /> Vista:
        </span>
        {monthsList.map((m) => (
          <button
            key={m.key}
            onClick={() => setSelectedMonthView(m.key)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              selectedMonthView === m.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto border border-gray-100 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
              <th className="p-3 text-center border-r border-gray-200">N° SUMINISTRO</th>
              <th className="p-3 border-r border-gray-200 min-w-[200px]">NOMBRE PREDIO / SEDE</th>
              <th className="p-3 border-r border-gray-200">CATEGORÍA</th>
              <th className="p-3 text-center border-r border-gray-200">N° RECIBO</th>
              
              {selectedMonthView === 'all' ? (
                <>
                  <th className="p-3 text-center border-r border-gray-200">CONSUMO ANUAL ({unitLabel})</th>
                  <th colSpan={12} className="p-3 text-center border-r border-gray-200 bg-blue-50/50 text-blue-900 font-bold">
                    DETALLE DE MONTOS FACTURADOS EN SOLES (ENE - DIC)
                  </th>
                  <th className="p-3 text-right border-r border-gray-200">TOTAL ANUAL (S/)</th>
                </>
              ) : (
                <>
                  <th className="p-3 text-center border-r border-gray-200">CONSUMO - {selectedMonthView.toUpperCase()} ({unitLabel})</th>
                  <th className="p-3 text-center border-r border-gray-200 bg-blue-50/50 text-blue-900 font-bold">
                    MONTO FACTURADO - {selectedMonthView.toUpperCase()}
                  </th>
                </>
              )}
              
              <th className="p-3 text-center">ACCIONES</th>
            </tr>

            {selectedMonthView === 'all' && (
              <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <th className="p-2 border-r border-gray-200"></th>
                <th className="p-2 border-r border-gray-200"></th>
                <th className="p-2 border-r border-gray-200"></th>
                <th className="p-2 border-r border-gray-200"></th>
                <th className="p-2 border-r border-gray-200"></th>

                {(['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'] as const).map((mKey, i) => (
                  <th key={mKey} className={`p-2 text-right border-r w-16 uppercase ${i === 11 ? 'border-gray-200' : 'border-gray-100'}`}>
                    {mKey}
                  </th>
                ))}

                <th className="p-2 border-r border-gray-200"></th>
                <th className="p-2"></th>
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-gray-100 text-gray-700">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={selectedMonthView === 'all' ? 19 : 7} className="p-8 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-8 h-8 text-gray-300" />
                    <p>No se encontraron registros para esta selección.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((record: SupplyRecord) => {
                const isMonthView = selectedMonthView !== 'all';
                const viewMonth = selectedMonthView as MonthKey;
                // Consumo REAL leído del detalle mensual; "—" si no existe
                const displayConsumption = isMonthView
                  ? formatConsumption(getMonthConsumption(record, viewMonth))
                  : formatConsumption(getAnnualConsumption(record));
                const displayReceipt = isMonthView
                  ? (getMonthReceipt(record, viewMonth) || 'S/N')
                  : (getLatestReceipt(record) || 'S/N');

                return (
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
                      {displayReceipt}
                    </td>

                    {selectedMonthView === 'all' ? (
                      <>
                        <td className="p-3 text-center font-bold text-blue-600 border-r border-gray-100">
                          {displayConsumption}
                        </td>
                        {MONTH_KEYS.map((mKey, i) => {
                          const monthlyVal = getMonthAmount(record, mKey);
                          return (
                            <td key={mKey} className={`p-2 text-right font-mono text-[11px] text-gray-600 border-r ${i === 11 ? 'border-gray-200' : 'border-gray-100'}`}>
                              {formatCurrency(monthlyVal)}
                            </td>
                          );
                        })}
                        <td className="p-3 text-right font-bold text-gray-900 border-r border-gray-100">
                          {formatCurrency(getAnnualAmount(record))}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 text-center font-bold text-blue-600 border-r border-gray-100">
                          {displayConsumption}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-blue-700 border-r border-gray-200 bg-blue-50/25">
                          {formatCurrency(getMonthAmount(record, viewMonth))}
                        </td>
                      </>
                    )}

                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onOpenReceiptModal && (
                          <button
                            onClick={() => {
                              const recordWithMonth = { 
                                ...record, 
                                selectedMonth: selectedMonthView 
                              };
                              onOpenReceiptModal(recordWithMonth);
                            }}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>Mostrar</span>
          <select
            value={itemsPerPage}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 cursor-pointer"
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