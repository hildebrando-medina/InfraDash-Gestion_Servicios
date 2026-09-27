import React, { useState, useEffect } from 'react';
import { SupplyRecord, UtilityType } from '../types';
import { X, Save, Zap, Droplet, FileText, AlertTriangle, Edit2 } from 'lucide-react';
import {
  MONTH_KEYS,
  MonthKey,
  MONTH_FULL_NAMES,
  buildMonthlyDetailsForForm,
  emptyMonthDetail,
  findExistingSupply,
  normalizeSupplyNumber,
  monthHasData
} from '../recordUtils';

interface SupplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: SupplyRecord) => void;
  recordToEdit: SupplyRecord | null;
  utilityType: UtilityType;
  onShowToast: (title: string, message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  existingRecords?: SupplyRecord[];
  onSwitchToEdit?: (record: SupplyRecord) => void;
}

const buildEmptyForm = (utilityType: UtilityType) => ({
  utilityType,
  supplyNumber: '',
  propertyName: '',
  address: '',
  category: 'Talara',
  year: 2026,
  monthlyDetails: buildMonthlyDetailsForForm(null),
  status: 'active'
});

export function SupplyModal({
  isOpen,
  onClose,
  onSave,
  recordToEdit,
  utilityType,
  onShowToast,
  existingRecords = [],
  onSwitchToEdit
}: SupplyModalProps) {
  const [activeTabMonth, setActiveTabMonth] = useState<MonthKey>('ene');
  const [formData, setFormData] = useState<any>(buildEmptyForm(utilityType));

  useEffect(() => {
    if (recordToEdit) {
      // Se cargan TODOS los meses ya guardados (también los del formato antiguo),
      // así editar nunca borra meses anteriores.
      setFormData({
        ...recordToEdit,
        monthlyDetails: buildMonthlyDetailsForForm(recordToEdit)
      });
      // Se abre directamente en el último mes con datos para seguir cargando desde ahí
      let lastWithData: MonthKey = 'ene';
      MONTH_KEYS.forEach(m => {
        if (monthHasData(recordToEdit, m)) lastWithData = m;
      });
      setActiveTabMonth(lastWithData);
    } else {
      setFormData(buildEmptyForm(utilityType));
      setActiveTabMonth('ene');
    }
  }, [recordToEdit, utilityType, isOpen]);

  // Servicio y año del registro que se está trabajando
  const recordUtility: UtilityType = (recordToEdit?.utilityType || formData.utilityType || utilityType) as UtilityType;
  const recordYear = Number(formData.year) || 2026;

  // Aviso anti-duplicados: ¿ya existe otro suministro con este mismo número?
  // Al EDITAR, solo se avisa si se cambia el número por el de otro suministro
  // (así se puede corregir una copia aunque todavía exista la otra).
  const numberUnchanged =
    !!recordToEdit &&
    normalizeSupplyNumber(formData.supplyNumber) === normalizeSupplyNumber(recordToEdit.supplyNumber) &&
    recordYear === (Number(recordToEdit.year) || 2026);
  const duplicateRecord = numberUnchanged
    ? null
    : findExistingSupply(
        existingRecords,
        formData.supplyNumber || '',
        recordUtility,
        recordYear,
        recordToEdit ? recordToEdit.id : undefined
      );

  if (!isOpen) return null;

  const handleMonthDetailChange = (field: string, value: any) => {
    const currentMonthData = formData.monthlyDetails?.[activeTabMonth] || emptyMonthDetail();
    
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

    if (duplicateRecord) {
      onShowToast(
        'Suministro repetido',
        `El suministro ${duplicateRecord.supplyNumber} ya existe. Use "Editar este suministro" para agregar el mes sin crear un duplicado.`,
        'warning'
      );
      return;
    }

    // Totales anuales calculados desde el detalle real de cada mes
    const monthlyDetails: any = {};
    const simpleMonthsAmount: any = {};
    let totalConsumption = 0;
    let totalAmount = 0;
    let latestReceipt = '';

    MONTH_KEYS.forEach(m => {
      const mData = formData.monthlyDetails?.[m] || emptyMonthDetail();
      const clean = {
        receipt: (mData.receipt || '').toString().trim(),
        previousReading: Number(mData.previousReading) || 0,
        currentReading: Number(mData.currentReading) || 0,
        consumption: Number(mData.consumption) || 0,
        amount: Number(mData.amount) || 0
      };
      monthlyDetails[m] = clean;
      simpleMonthsAmount[m] = clean.amount;
      totalConsumption += clean.consumption;
      totalAmount += clean.amount;
      if (clean.receipt) latestReceipt = clean.receipt;
    });

    const recordToSave: SupplyRecord = {
      ...(recordToEdit || {}),
      id: recordToEdit ? recordToEdit.id : Date.now().toString(),
      utilityType: recordUtility,
      supplyNumber: (formData.supplyNumber || '').toString().trim(),
      propertyName: formData.propertyName || '',
      address: formData.address || formData.propertyName || '',
      category: formData.category || 'Talara',
      receiptNumber: latestReceipt,
      consumption: Number(totalConsumption.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      year: recordYear,
      months: simpleMonthsAmount, // Montos en soles por mes
      monthlyDetails: monthlyDetails, // Detalle completo mes a mes
      status: formData.status || 'active'
    } as any;
    delete (recordToSave as any).selectedMonth;

    onSave(recordToSave);
    onShowToast('Éxito', recordToEdit ? 'Suministro actualizado correctamente.' : 'Suministro registrado correctamente.', 'success');
    onClose();
  };

  const currentMonthInfo = formData.monthlyDetails?.[activeTabMonth] || emptyMonthDetail();
  const unitLabel = recordUtility === 'energy' ? 'kW-h' : 'm³';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-8">
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {recordUtility === 'energy' ? <Zap className="w-5 h-5 text-amber-400" /> : <Droplet className="w-5 h-5 text-cyan-400" />}
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

          {/* Aviso anti-duplicados */}
          {duplicateRecord && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Este suministro ya existe: {duplicateRecord.supplyNumber}</p>
                  <p>
                    Registrado como "{duplicateRecord.propertyName || duplicateRecord.address}". Para agregar un nuevo mes,
                    edite ese suministro; así no se crea un duplicado ni se separan los meses.
                  </p>
                </div>
              </div>
              {onSwitchToEdit && (
                <button
                  type="button"
                  onClick={() => onSwitchToEdit(duplicateRecord)}
                  className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Edit2 className="w-4 h-4" /> Editar este suministro
                </button>
              )}
            </div>
          )}

          {/* Selector de Meses */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" /> Ingrese Datos del Recibo por Mes Seleccionado:
            </label>
            <p className="text-[11px] text-slate-500 mb-2">Los meses en verde ya tienen datos guardados.</p>
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              {MONTH_KEYS.map(m => {
                const d = formData.monthlyDetails?.[m];
                const filled = !!d && (Number(d.amount) > 0 || Number(d.consumption) > 0 || (d.receipt || '') !== '');
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setActiveTabMonth(m)}
                    title={filled ? `${MONTH_FULL_NAMES[m]}: con datos` : `${MONTH_FULL_NAMES[m]}: sin datos`}
                    className={`flex-1 min-w-[45px] py-1.5 text-center uppercase font-bold rounded-lg transition-all cursor-pointer ${
                      activeTabMonth === m
                        ? 'bg-blue-600 text-white shadow-sm'
                        : filled
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
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
              disabled={!!duplicateRecord}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" /> Guardar Suministro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}