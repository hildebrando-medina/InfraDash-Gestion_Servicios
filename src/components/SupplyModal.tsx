import React, { useState, useEffect } from 'react';
import { SupplyRecord, UtilityType } from '../types';
import { X, Save, Zap, Droplet, FileText, AlertTriangle, Edit2, CheckCircle2, ShieldCheck } from 'lucide-react';
import {
  MONTH_KEYS,
  MonthKey,
  MonthDetail,
  MONTH_FULL_NAMES,
  buildMonthlyDetailsForForm,
  emptyMonthDetail,
  findExistingSupply,
  normalizeSupplyNumber,
  isEmptyMonthDetail,
  detailHasSavedData,
  lastRealReadingBefore,
  nextMonthToFill
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
  // Mes en que debe abrirse (por ejemplo, desde "Revisar llenado")
  initialMonth?: MonthKey | null;
}

// Un cambio en un campo de un mes que ya estaba guardado
interface FieldChange {
  label: string;
  before: string;
  after: string;
}
interface MonthChange {
  month: MonthKey;
  fields: FieldChange[];
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

const monthName = (m: MonthKey) => MONTH_FULL_NAMES[m].toUpperCase();

const fmtNum = (n: number) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const fmtSoles = (n: number) =>
  'S/ ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Detalle "limpio" de un mes (números y texto sin espacios)
const cleanDetail = (d: any): MonthDetail => ({
  receipt: (d?.receipt || '').toString().trim(),
  previousReading: Number(d?.previousReading) || 0,
  currentReading: Number(d?.currentReading) || 0,
  consumption: Number(d?.consumption) || 0,
  amount: Number(d?.amount) || 0
});

// ¿El consumo guardado fue escrito a mano? (no coincide con actual - anterior)
const isManualConsumption = (d: MonthDetail): boolean => {
  const calc = Math.max(0, Number(((Number(d.currentReading) || 0) - (Number(d.previousReading) || 0)).toFixed(2)));
  return (Number(d.consumption) || 0) > 0 && Number(d.consumption) !== calc;
};

// Mes guardado sin lecturas: la casilla "Este recibo no tiene lectura" aparece marcada
const isSavedWithoutReading = (d: MonthDetail): boolean =>
  detailHasSavedData(d) && !(Number(d.previousReading) > 0) && !(Number(d.currentReading) > 0);

// Compara un mes guardado con lo que se va a guardar
const diffMonth = (before: MonthDetail, after: MonthDetail): FieldChange[] => {
  const out: FieldChange[] = [];
  if (before.receipt !== after.receipt)
    out.push({ label: 'N° de recibo', before: before.receipt || '(vacío)', after: after.receipt || '(vacío)' });
  if (before.previousReading !== after.previousReading)
    out.push({ label: 'Lectura anterior', before: fmtNum(before.previousReading), after: fmtNum(after.previousReading) });
  if (before.currentReading !== after.currentReading)
    out.push({ label: 'Lectura actual', before: fmtNum(before.currentReading), after: fmtNum(after.currentReading) });
  if (before.consumption !== after.consumption)
    out.push({ label: 'Consumo', before: fmtNum(before.consumption), after: fmtNum(after.consumption) });
  if (before.amount !== after.amount)
    out.push({ label: 'Monto', before: fmtSoles(before.amount), after: fmtSoles(after.amount) });
  return out;
};

export function SupplyModal({
  isOpen,
  onClose,
  onSave,
  recordToEdit,
  utilityType,
  onShowToast,
  existingRecords = [],
  onSwitchToEdit,
  initialMonth = null
}: SupplyModalProps) {
  const [activeTabMonth, setActiveTabMonth] = useState<MonthKey>('ene');
  const [formData, setFormData] = useState<any>(buildEmptyForm(utilityType));
  // Meses cuyo consumo fue escrito a mano: las lecturas ya no lo recalculan ni lo borran
  const [manualConsumption, setManualConsumption] = useState<Record<string, boolean>>({});
  // Meses cuya Lectura Anterior fue puesta automáticamente (sugerencia)
  const [suggestedPrev, setSuggestedPrev] = useState<Record<string, boolean>>({});
  // Meses marcados con "Este recibo no tiene lectura"
  const [noReading, setNoReading] = useState<Record<string, boolean>>({});
  // Datos guardados al abrir (para detectar cambios en meses ya guardados)
  const [originalDetails, setOriginalDetails] = useState<Record<MonthKey, MonthDetail> | null>(null);
  // Aviso de confirmación y resultado
  const [pendingChanges, setPendingChanges] = useState<MonthChange[] | null>(null);
  const [pendingRecord, setPendingRecord] = useState<SupplyRecord | null>(null);
  const [resultInfo, setResultInfo] = useState<{ kind: 'changed' | 'kept'; changes: MonthChange[] } | null>(null);

  // Pone la Lectura Anterior sugerida en un mes vacío (sin tocar meses con datos)
  const withSuggestion = (
    details: Record<MonthKey, MonthDetail>,
    month: MonthKey,
    suggested: Record<string, boolean>,
    noReadingMap: Record<string, boolean>
  ): { details: Record<MonthKey, MonthDetail>; applied: boolean } => {
    if (noReadingMap[month]) return { details, applied: false };
    const d = details[month];
    const onlySuggested =
      suggested[month] &&
      (d.receipt || '') === '' &&
      !(Number(d.currentReading) > 0) &&
      !(Number(d.consumption) > 0) &&
      !(Number(d.amount) > 0);
    if (!isEmptyMonthDetail(d) && !onlySuggested) return { details, applied: false };
    const last = lastRealReadingBefore(details, month);
    if (last <= 0) return { details, applied: false };
    return {
      details: { ...details, [month]: { ...emptyMonthDetail(), previousReading: last } },
      applied: true
    };
  };

  useEffect(() => {
    setPendingChanges(null);
    setPendingRecord(null);
    setResultInfo(null);
    if (recordToEdit) {
      // Se cargan TODOS los meses ya guardados (también los del formato antiguo),
      // así editar nunca borra meses anteriores.
      const details = buildMonthlyDetailsForForm(recordToEdit);
      const manual: Record<string, boolean> = {};
      const noRead: Record<string, boolean> = {};
      MONTH_KEYS.forEach(m => {
        if (isManualConsumption(details[m])) manual[m] = true;
        if (isSavedWithoutReading(details[m])) noRead[m] = true;
      });
      // Se abre en el mes siguiente al último con datos (o en el mes pedido)
      const start: MonthKey = initialMonth || nextMonthToFill(recordToEdit);
      const sug = withSuggestion(details, start, {}, noRead);
      setOriginalDetails(buildMonthlyDetailsForForm(recordToEdit));
      setFormData({ ...recordToEdit, monthlyDetails: sug.details });
      setManualConsumption(manual);
      setNoReading(noRead);
      setSuggestedPrev(sug.applied ? { [start]: true } : {});
      setActiveTabMonth(start);
    } else {
      setOriginalDetails(null);
      setFormData(buildEmptyForm(utilityType));
      setManualConsumption({});
      setNoReading({});
      setSuggestedPrev({});
      setActiveTabMonth(initialMonth || 'ene');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordToEdit, utilityType, isOpen, initialMonth]);

  // Servicio y año del registro que se está trabajando
  const recordUtility: UtilityType = (recordToEdit?.utilityType || formData.utilityType || utilityType) as UtilityType;
  const recordYear = Number(formData.year) || 2026;

  // Aviso anti-duplicados: ¿ya existe otro suministro con este mismo número?
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

  // Cambiar de mes: si el mes está vacío, se sugiere la Lectura Anterior
  const selectMonth = (m: MonthKey) => {
    setActiveTabMonth(m);
    const sug = withSuggestion(formData.monthlyDetails, m, suggestedPrev, noReading);
    if (sug.applied) {
      setFormData((prev: any) => ({ ...prev, monthlyDetails: sug.details }));
      setSuggestedPrev(prev => ({ ...prev, [m]: true }));
    }
  };

  const handleMonthDetailChange = (field: string, value: any) => {
    const currentMonthData = formData.monthlyDetails?.[activeTabMonth] || emptyMonthDetail();

    let updatedMonth = { ...currentMonthData, [field]: value };

    // El consumo escrito a mano queda protegido para este mes
    if (field === 'consumption') {
      setManualConsumption(prev => ({ ...prev, [activeTabMonth]: true }));
    }

    // La Lectura Anterior escrita por el técnico deja de ser sugerencia
    if (field === 'previousReading') {
      setSuggestedPrev(prev => ({ ...prev, [activeTabMonth]: false }));
    }

    // Si escribe una lectura, la casilla "sin lectura" se desmarca sola
    if ((field === 'previousReading' || field === 'currentReading') && (parseFloat(value) || 0) > 0) {
      setNoReading(prev => ({ ...prev, [activeTabMonth]: false }));
    }

    // Si cambian las lecturas, el consumo se calcula solo,
    // EXCEPTO cuando fue escrito a mano (nunca se borra)
    if ((field === 'previousReading' || field === 'currentReading') && !manualConsumption[activeTabMonth]) {
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

  // Casilla "Este recibo no tiene lectura" (no bloquea los campos)
  const handleNoReadingToggle = (checked: boolean) => {
    const m = activeTabMonth;
    const d = formData.monthlyDetails?.[m] || emptyMonthDetail();
    if (checked) {
      setNoReading(prev => ({ ...prev, [m]: true }));
      setSuggestedPrev(prev => ({ ...prev, [m]: false }));
      setFormData((prev: any) => ({
        ...prev,
        monthlyDetails: {
          ...prev.monthlyDetails,
          [m]: {
            ...d,
            previousReading: 0,
            currentReading: 0,
            consumption: manualConsumption[m] ? d.consumption : 0
          }
        }
      }));
    } else {
      const newNoReading = { ...noReading, [m]: false };
      setNoReading(newNoReading);
      // Al desmarcar, si no hay lecturas, se vuelve a sugerir la Lectura Anterior
      if (!(Number(d.previousReading) > 0) && !(Number(d.currentReading) > 0)) {
        const last = lastRealReadingBefore(formData.monthlyDetails, m);
        if (last > 0) {
          setSuggestedPrev(prev => ({ ...prev, [m]: true }));
          setFormData((prev: any) => ({
            ...prev,
            monthlyDetails: { ...prev.monthlyDetails, [m]: { ...d, previousReading: last } }
          }));
        }
      }
    }
  };

  // Guarda de verdad y muestra el resultado
  const commitSave = (record: SupplyRecord, changes: MonthChange[]) => {
    onSave(record);
    onShowToast('Éxito', recordToEdit ? 'Suministro actualizado correctamente.' : 'Suministro registrado correctamente.', 'success');
    if (changes.length > 0) {
      setResultInfo({ kind: 'changed', changes });
    } else {
      onClose();
    }
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
      let clean = cleanDetail(formData.monthlyDetails?.[m] || emptyMonthDetail());
      // Lectura Anterior sugerida que no se usó (sin lectura actual): no se guarda.
      // Si el mes no tiene nada más, queda vacío como estaba.
      if (suggestedPrev[m] && clean.currentReading === 0) {
        clean = { ...clean, previousReading: 0 };
      }
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

    // ¿Se están cambiando datos de meses que ya estaban guardados?
    const changes: MonthChange[] = [];
    if (originalDetails) {
      MONTH_KEYS.forEach(m => {
        const before = cleanDetail(originalDetails[m]);
        if (!detailHasSavedData(before)) return;
        const fields = diffMonth(before, monthlyDetails[m]);
        if (fields.length > 0) changes.push({ month: m, fields });
      });
    }

    if (changes.length > 0) {
      setPendingChanges(changes);
      setPendingRecord(recordToSave);
      return;
    }

    commitSave(recordToSave, []);
  };

  // Respuesta SÍ: se guardan los cambios
  const confirmYes = () => {
    if (!pendingRecord || !pendingChanges) return;
    const changes = pendingChanges;
    const rec = pendingRecord;
    setPendingChanges(null);
    setPendingRecord(null);
    commitSave(rec, changes);
  };

  // Respuesta NO: no se guarda nada y los meses vuelven a sus datos guardados
  const confirmNo = () => {
    if (!pendingChanges || !originalDetails) return;
    const changes = pendingChanges;
    const restored = { ...formData.monthlyDetails };
    const manual = { ...manualConsumption };
    const noRead = { ...noReading };
    const sug = { ...suggestedPrev };
    changes.forEach(c => {
      const orig = cleanDetail(originalDetails[c.month]);
      restored[c.month] = orig;
      manual[c.month] = isManualConsumption(orig);
      noRead[c.month] = isSavedWithoutReading(orig);
      sug[c.month] = false;
    });
    setFormData((prev: any) => ({ ...prev, monthlyDetails: restored }));
    setManualConsumption(manual);
    setNoReading(noRead);
    setSuggestedPrev(sug);
    setPendingChanges(null);
    setPendingRecord(null);
    setResultInfo({ kind: 'kept', changes });
  };

  const currentMonthInfo = formData.monthlyDetails?.[activeTabMonth] || emptyMonthDetail();
  const unitLabel = recordUtility === 'energy' ? 'kW-h' : 'm³';
  const monthIsSaved = !!originalDetails && detailHasSavedData(originalDetails[activeTabMonth]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-8">
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
            <p className="text-[11px] text-slate-500 mb-2">
              Los meses en verde ya tienen datos guardados. Haga clic en el mes del recibo (queda en azul) y escriba sus datos.
            </p>
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              {MONTH_KEYS.map(m => {
                const d = formData.monthlyDetails?.[m];
                const filled = !!d && (Number(d.amount) > 0 || Number(d.consumption) > 0 || (d.receipt || '') !== '');
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => selectMonth(m)}
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

          {/* Mes que se está llenando */}
          <div
            className={`rounded-lg px-3 py-2 font-semibold flex items-center gap-2 ${
              monthIsSaved ? 'bg-amber-50 border border-amber-300 text-amber-900' : 'bg-blue-50 border border-blue-200 text-blue-900'
            }`}
          >
            {monthIsSaved ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <FileText className="w-4 h-4 shrink-0" />}
            {monthIsSaved
              ? `Está viendo ${monthName(activeTabMonth)}, que ya tiene datos guardados. Si escribe aquí, cambiará ${monthName(activeTabMonth)}.`
              : `Está llenando el recibo de ${monthName(activeTabMonth)}.`}
          </div>

          {/* Formulario Específico del Mes Activo */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 flex flex-col gap-3">
            <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer select-none w-fit">
              <input
                type="checkbox"
                checked={!!noReading[activeTabMonth]}
                onChange={e => handleNoReadingToggle(e.target.checked)}
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
              Este recibo no tiene lectura
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
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
                {suggestedPrev[activeTabMonth] && (
                  <p className="text-[10px] text-blue-700 mt-1 leading-tight">
                    Automática: lectura actual del último mes con lectura. Puede cambiarla.
                  </p>
                )}
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
                {manualConsumption[activeTabMonth] ? (
                  <p className="text-[10px] text-amber-700 mt-1 leading-tight">
                    Escrito a mano (protegido).{' '}
                    <button
                      type="button"
                      onClick={() => {
                        const prevR = parseFloat(currentMonthInfo.previousReading) || 0;
                        const currR = parseFloat(currentMonthInfo.currentReading) || 0;
                        setManualConsumption(prev => ({ ...prev, [activeTabMonth]: false }));
                        setFormData((prev: any) => ({
                          ...prev,
                          monthlyDetails: {
                            ...prev.monthlyDetails,
                            [activeTabMonth]: {
                              ...(prev.monthlyDetails?.[activeTabMonth] || emptyMonthDetail()),
                              consumption: Math.max(0, Number((currR - prevR).toFixed(2)))
                            }
                          }
                        }));
                      }}
                      className="underline font-semibold cursor-pointer"
                    >
                      Calcular con lecturas
                    </button>
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">Se calcula con las lecturas, o escríbalo a mano.</p>
                )}
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

        {/* Aviso: se van a cambiar meses que ya estaban guardados */}
        {pendingChanges && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-label="Confirmar cambios">
            <div className="bg-white rounded-xl shadow-2xl border border-amber-300 max-w-lg w-full p-5 text-xs">
              <div className="flex items-start gap-2 text-amber-900 mb-3">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <p className="font-bold text-sm">
                  Está cambiando {pendingChanges.map(c => monthName(c.month)).join(', ')}, que ya tenía datos. ¿Continuar?
                </p>
              </div>
              <ChangeList changes={pendingChanges} />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={confirmNo}
                  className="px-5 py-2 rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  NO
                </button>
                <button
                  type="button"
                  onClick={confirmYes}
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
                >
                  SÍ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resultado: datos cambiados (SÍ) o datos conservados (NO) */}
        {resultInfo && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-label="Resultado">
            <div
              className={`bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 text-xs border ${
                resultInfo.kind === 'changed' ? 'border-emerald-300' : 'border-blue-300'
              }`}
            >
              <div className={`flex items-start gap-2 mb-3 ${resultInfo.kind === 'changed' ? 'text-emerald-800' : 'text-blue-800'}`}>
                {resultInfo.kind === 'changed' ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <ShieldCheck className="w-6 h-6 shrink-0" />}
                <div>
                  <p className="font-bold text-sm">
                    {resultInfo.kind === 'changed'
                      ? `Datos cambiados – ${resultInfo.changes.map(c => monthName(c.month)).join(', ')}`
                      : `Datos conservados – ${resultInfo.changes.map(c => monthName(c.month)).join(', ')} sin cambios`}
                  </p>
                  <p className="text-slate-600">
                    {resultInfo.kind === 'changed'
                      ? 'Se guardaron estos cambios:'
                      : 'No se guardó nada. Se mantienen los datos que ya estaban guardados. Haga clic en el mes correcto y escriba ahí el recibo.'}
                  </p>
                </div>
              </div>
              {resultInfo.kind === 'changed' && <ChangeList changes={resultInfo.changes} />}
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => {
                    const kind = resultInfo.kind;
                    setResultInfo(null);
                    if (kind === 'changed') onClose();
                  }}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Lista "antes → después" de los cambios por mes
function ChangeList({ changes }: { changes: MonthChange[] }) {
  return (
    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
      {changes.map(c => (
        <div key={c.month} className="border border-slate-200 rounded-lg p-2">
          <p className="font-bold text-slate-800 mb-1">{MONTH_FULL_NAMES[c.month].toUpperCase()}</p>
          <table className="w-full">
            <tbody>
              {c.fields.map(f => (
                <tr key={f.label}>
                  <td className="text-slate-600 pr-2">{f.label}</td>
                  <td className="text-slate-500 line-through pr-2">{f.before}</td>
                  <td className="text-slate-400 pr-2">→</td>
                  <td className="font-semibold text-slate-900">{f.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
