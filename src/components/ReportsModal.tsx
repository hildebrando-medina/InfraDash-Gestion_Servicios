import React, { useMemo, useState } from 'react';
import { FileText, X, Award, AlertTriangle, FileBarChart, Loader2, Search } from 'lucide-react';
import { SupplyRecord, UtilityType } from '../types';
import { MONTH_KEYS, MonthKey } from '../recordUtils';
import {
  AREAS_SUGERIDAS,
  Candidate,
  CandidateKind,
  DEFAULT_MIN_SOLES,
  DEFAULT_PCT,
  MES_NOMBRE,
  MES_TITULO,
  ReportPeriod,
  analyzeSupply,
  buildServiceSection,
  fechaLarga,
  findCandidates,
  fmtNum,
  fmtPct,
  fmtSol,
  getSavedArea,
  lastMonthWithReceipt,
  monthHasReceipt,
  periodLabel,
  saveArea,
  serviceOf,
  serviceTitle,
  suggestedMonth,
  unitOf,
  yearsOf
} from '../reports';

interface ReportsModalProps {
  records: SupplyRecord[];
  utilityType: UtilityType;
  onClose: () => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const baseInput = 'border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300';
const inputCls = 'w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300';

const Field = ({ label, value, set, list, testid, error }: { label: string; value: string; set: (v: string) => void; list?: string; testid?: string; error?: string }) => (
  <label className="flex flex-col gap-0.5">
    <span className={`font-semibold ${error ? 'text-red-700' : 'text-slate-700'}`}>{label}</span>
    <input
      className={`${inputCls} ${error ? 'border-red-500 ring-2 ring-red-200 bg-red-50' : ''}`}
      value={value}
      onChange={e => set(e.target.value)}
      list={list}
      data-testid={testid}
    />
    {error && (
      <span className="text-red-700 font-bold text-xs" data-testid={testid ? `${testid}-error` : undefined}>
        {error}
      </span>
    )}
  </label>
);

export const ReportsModal: React.FC<ReportsModalProps> = ({ records, utilityType, onClose, onShowToast }) => {
  const [tab, setTab] = useState<'memo' | 'analisis' | 'informe'>('memo');
  const unit = unitOf(utilityType);
  const year = records.find(r => r.year)?.year || new Date().getFullYear();
  const [busy, setBusy] = useState(false);

  // ---------- Memorando ----------
  const [month, setMonth] = useState<MonthKey>(() => suggestedMonth(records, utilityType));
  const [pct, setPct] = useState<number>(DEFAULT_PCT);
  const [minSoles, setMinSoles] = useState<number>(DEFAULT_MIN_SOLES);
  const candidates = useMemo(() => findCandidates(records, utilityType, month, pct, minSoles), [records, utilityType, month, pct, minSoles]);
  const ahorro = candidates.filter(c => c.kind === 'ahorro');
  const exceso = candidates.filter(c => c.kind === 'exceso');
  const [selKind, setSelKind] = useState<CandidateKind | null>(null);
  const [selIds, setSelIds] = useState<string[]>([]);
  const selected = candidates.filter(c => c.kind === selKind && selIds.includes(c.stats.record.id));

  const [para, setParaRaw] = useState('');
  const [faltaPara, setFaltaPara] = useState(false);
  const setPara = (v: string) => {
    setParaRaw(v);
    if (v.trim()) setFaltaPara(false);
  };
  const [de, setDe] = useState('Unidad Facilidades de Mantenimiento');
  const [numero, setNumero] = useState(`FDM-XXXX-${year}`);
  const [fecha, setFecha] = useState(fechaLarga());
  const [firmaNombre, setFirmaNombre] = useState('Jorge Luis Wiesse Lopez');
  const [firmaCargo, setFirmaCargo] = useState('Jefe');
  const [firmaUnidad, setFirmaUnidad] = useState('Unidad Facilidades de Mantenimiento');
  const [iniciales, setIniciales] = useState('M.Machare');

  const toggle = (c: Candidate) => {
    const id = c.stats.record.id;
    let ids = selKind === c.kind ? [...selIds] : [];
    ids = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
    setSelKind(ids.length ? c.kind : null);
    setSelIds(ids);
    if (ids.length && !para) {
      const saved = getSavedArea(c.stats.record);
      if (saved) setPara(saved);
    }
  };

  const predios = selected.map(c => c.stats.record.propertyName || c.stats.record.supplyNumber).join(' y ');
  const asuntoAuto =
    selKind === 'ahorro'
      ? `Reconocimiento por ahorro en el consumo de ${serviceOf(utilityType)} – ${predios}, ${MES_NOMBRE[month]} ${year}`
      : selKind === 'exceso'
        ? `Aumento en el consumo de ${serviceOf(utilityType)} – ${predios}, ${MES_NOMBRE[month]} ${year}`
        : '';
  const [asuntoEdit, setAsuntoEdit] = useState<string | null>(null);
  const asunto = asuntoEdit ?? asuntoAuto;

  const generateMemo = async () => {
    if (!selected.length || !selKind) return;
    if (!para.trim()) {
      setFaltaPara(true);
      return;
    }
    setBusy(true);
    try {
      const mod = await import('../reportDocx');
      const blob = await mod.buildMemo(selKind, selected, utilityType, {
        docType: 'MEMORANDO',
        numero,
        para: para.trim(),
        de,
        fecha,
        asunto,
        firmaNombre,
        firmaCargo,
        firmaUnidad,
        iniciales
      });
      const name = `Memorando_${selKind === 'ahorro' ? 'Reconocimiento' : 'Advertencia'}_${utilityType === 'energy' ? 'Energia' : 'Agua'}_${MES_TITULO[month]}${year}_${selected.map(c => c.stats.record.supplyNumber).join('-')}.docx`;
      mod.downloadBlob(blob, name);
      saveArea(selected.map(c => c.stats.record), para.trim());
      onShowToast?.('Memorando generado', `Se descargó "${name}". Ábralo en Word, ponga el N° y revíselo antes de firmar.`, 'success');
    } catch (e: any) {
      console.error('[InfraDash reportes]', e);
      onShowToast?.('No se pudo generar', e?.message || 'Intente de nuevo.', 'error');
    } finally {
      setBusy(false);
    }
  };

  // ---------- Informe ----------
  const [pType, setPType] = useState<ReportPeriod['type']>('mensual');
  const [pMonth, setPMonth] = useState<number>(() => MONTH_KEYS.indexOf(suggestedMonth(records)));
  const [pSem, setPSem] = useState<number>(() => (MONTH_KEYS.indexOf(suggestedMonth(records)) >= 6 ? 1 : 0));
  const period: ReportPeriod = { type: pType, index: pType === 'mensual' ? pMonth : pType === 'semestral' ? pSem : 0 };
  const [iPara, setIPara] = useState('Unidad Facilidades de Mantenimiento – Jorge Luis Wiesse Lopez, Jefe');
  const [iDe, setIDe] = useState('Coordinación de Mantenimiento No Industrial');
  const [iNumero, setINumero] = useState(`FDM-XXXX-${year}`);
  const [iFecha, setIFecha] = useState(fechaLarga());
  const [iFirmaNombre, setIFirmaNombre] = useState('Miguel Martin Machare Murillo');
  const [iFirmaCargo, setIFirmaCargo] = useState('Coordinador');
  const [iFirmaUnidad, setIFirmaUnidad] = useState('Mantenimiento No Industrial');
  const [iIniciales, setIIniciales] = useState('');
  const tipoTxt = pType === 'mensual' ? 'mensual' : pType === 'semestral' ? 'semestral' : 'anual';
  const iAsunto = `Informe ${tipoTxt} de consumo de energía eléctrica y agua potable de predios externos – ${periodLabel(period, year)}`;

  const generateInforme = async () => {
    setBusy(true);
    try {
      const mod = await import('../reportDocx');
      const sections = (['energy', 'water'] as UtilityType[]).map(u => buildServiceSection(records, u, period));
      const blob = await mod.buildInforme(period, year, sections, {
        docType: 'INFORME',
        numero: iNumero,
        para: iPara,
        de: iDe,
        fecha: iFecha,
        asunto: iAsunto,
        firmaNombre: iFirmaNombre,
        firmaCargo: iFirmaCargo,
        firmaUnidad: iFirmaUnidad,
        iniciales: iIniciales
      });
      const per = pType === 'mensual' ? MES_TITULO[MONTH_KEYS[pMonth]] : pType === 'semestral' ? `Semestre${pSem + 1}` : 'Anual';
      const name = `Informe_${tipoTxt}_Energia_y_Agua_${per}${year}.docx`;
      mod.downloadBlob(blob, name);
      onShowToast?.('Informe generado', `Se descargó "${name}" (Energía primero y Agua después).`, 'success');
    } catch (e: any) {
      console.error('[InfraDash reportes]', e);
      onShowToast?.('No se pudo generar', e?.message || 'Intente de nuevo.', 'error');
    } finally {
      setBusy(false);
    }
  };

  // ---------- Analizar un suministro ----------
  const aYears = useMemo(() => yearsOf(records, utilityType), [records, utilityType]);
  const [aYear, setAYear] = useState<number>(() => aYears[0] || year);
  const aList = useMemo(
    () =>
      records
        .filter(r => r.utilityType === utilityType && (Number(r.year) || 0) === aYear)
        .sort((x, y) => String(x.supplyNumber).localeCompare(String(y.supplyNumber))),
    [records, utilityType, aYear]
  );
  const optLabel = (r: SupplyRecord) => `${r.supplyNumber} — ${r.propertyName || r.address || ''}`.trim();
  const [aText, setAText] = useState('');
  const [aRecId, setARecId] = useState<string | null>(null);
  const [aMonth, setAMonth] = useState<MonthKey>(() => suggestedMonth(records, utilityType));
  const [faltaSum, setFaltaSum] = useState(false);
  const aRec = aList.find(r => r.id === aRecId) || null;
  const pickText = (v: string) => {
    setAText(v);
    const t = v.trim().toLowerCase();
    const found =
      aList.find(r => optLabel(r).toLowerCase() === t) || aList.find(r => String(r.supplyNumber).trim().toLowerCase() === t) || null;
    setARecId(found ? found.id : null);
    if (found) {
      setFaltaSum(false);
      const lm = lastMonthWithReceipt(found);
      if (lm) setAMonth(lm);
    }
  };
  const aOk = !!aRec && monthHasReceipt(aRec, aMonth);
  const analisis = useMemo(() => (aRec && aOk ? analyzeSupply(records, aRec, aMonth) : null), [records, aRec, aMonth, aOk]);
  const [aPara, setAPara] = useState('Unidad Facilidades de Mantenimiento – Jorge Luis Wiesse Lopez, Jefe');
  const [aDe, setADe] = useState('Coordinación de Mantenimiento No Industrial');
  const [aNumero, setANumero] = useState(`FDM-XXXX-${year}`);
  const [aFecha, setAFecha] = useState(fechaLarga());
  const [aFirmaNombre, setAFirmaNombre] = useState('Miguel Martin Machare Murillo');
  const [aFirmaCargo, setAFirmaCargo] = useState('Coordinador');
  const [aFirmaUnidad, setAFirmaUnidad] = useState('Mantenimiento No Industrial');
  const [aIniciales, setAIniciales] = useState('');
  const aAsuntoAuto = aRec
    ? `Análisis del consumo de ${serviceOf(utilityType)} – ${aRec.propertyName || aRec.supplyNumber} (suministro ${aRec.supplyNumber}), ${MES_NOMBRE[aMonth]} ${aYear}`
    : '';
  const [aAsuntoEdit, setAAsuntoEdit] = useState<string | null>(null);
  const aAsunto = aAsuntoEdit ?? aAsuntoAuto;

  const generateAnalisis = async () => {
    if (!aRec) {
      setFaltaSum(true);
      return;
    }
    if (!analisis) return;
    setBusy(true);
    try {
      const mod = await import('../reportDocx');
      const blob = await mod.buildAnalisis(analisis, {
        docType: 'INFORME',
        numero: aNumero,
        para: aPara,
        de: aDe,
        fecha: aFecha,
        asunto: aAsunto,
        firmaNombre: aFirmaNombre,
        firmaCargo: aFirmaCargo,
        firmaUnidad: aFirmaUnidad,
        iniciales: aIniciales
      });
      const name = `Analisis_${utilityType === 'energy' ? 'Energia' : 'Agua'}_${aRec.supplyNumber}_${MES_TITULO[aMonth]}${aYear}.docx`;
      mod.downloadBlob(blob, name);
      onShowToast?.('Análisis generado', `Se descargó "${name}". Ábralo en Word, ponga el N° y revíselo antes de firmar.`, 'success');
    } catch (e: any) {
      console.error('[InfraDash reportes]', e);
      onShowToast?.('No se pudo generar', e?.message || 'Intente de nuevo.', 'error');
    } finally {
      setBusy(false);
    }
  };
  const pctS = (p: number | null | undefined) => (p === null || p === undefined ? '—' : `${p >= 0 ? '+' : '–'} ${fmtPct(Math.abs(p))}`);
  const solS = (v: number) => `${v >= 0 ? '+' : '–'} ${fmtSol(Math.abs(v))}`;

  const renderCard = (c: Candidate) => {
    const on = selKind === c.kind && selIds.includes(c.stats.record.id);
    const good = c.kind === 'ahorro';
    return (
      <label
        key={c.stats.record.id}
        className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer ${on ? (good ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50') : 'border-slate-200 bg-white hover:bg-slate-50'}`}
        data-testid={good ? 'cand-ahorro' : 'cand-exceso'}
      >
        <input type="checkbox" checked={on} onChange={() => toggle(c)} className="mt-0.5" />
        <span className="flex-1">
          <span className="font-bold font-mono">{c.stats.record.supplyNumber}</span> — {c.stats.record.propertyName}
          <span className="block text-slate-600">
            {MES_TITULO[month]}: <strong>{fmtSol(c.stats.amount)}</strong> ({fmtNum(c.stats.consumption)} {unit}) · promedio {fmtSol(c.stats.avgAmount)} ({fmtNum(c.stats.avgConsumption)} {unit})
          </span>
          <span className={`block font-semibold ${good ? 'text-emerald-700' : 'text-red-700'}`}>
            {good ? 'Ahorro' : 'Exceso'}: {fmtSol(c.diffAmount)} ({fmtPct(c.pctAmount)})
          </span>
        </span>
      </label>
    );
  };


  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" role="dialog" aria-label="Reportes">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col text-xs">
        <div className="bg-slate-900 text-white px-5 py-3 flex justify-between items-center">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <FileText className="w-5 h-5" /> Reportes – {serviceTitle(utilityType)}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer" title="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setTab('memo')}
            className={`flex-1 px-4 py-2.5 font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${tab === 'memo' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-600'}`}
          >
            <Award className="w-4 h-4" /> Memorando: ahorro o exceso
          </button>
          <button
            onClick={() => setTab('analisis')}
            data-testid="tab-analisis"
            className={`flex-1 px-4 py-2.5 font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${tab === 'analisis' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-600'}`}
          >
            <Search className="w-4 h-4" /> Analizar un suministro
          </button>
          <button
            onClick={() => setTab('informe')}
            className={`flex-1 px-4 py-2.5 font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${tab === 'informe' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-600'}`}
          >
            <FileBarChart className="w-4 h-4" /> Informe general (mensual, semestral, anual)
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          {tab === 'memo' && (
            <>
              <div className="flex flex-wrap items-end gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <label className="flex flex-col gap-0.5">
                  <span className="font-semibold">Mes del recibo</span>
                  <select className={baseInput + ' w-40'} value={month} onChange={e => { setMonth(e.target.value as MonthKey); setSelIds([]); setSelKind(null); }} data-testid="rep-mes">
                    {MONTH_KEYS.map(m => (
                      <option key={m} value={m}>{MES_TITULO[m]} {year}</option>
                    ))}
                  </select>
                </label>
                <span className="pb-2">Es <strong>significativo</strong> si el monto varía al menos</span>
                <input type="number" className={baseInput + ' w-16'} value={pct} min={5} onChange={e => setPct(Number(e.target.value) || 0)} data-testid="rep-pct" />
                <span className="pb-2">% y al menos S/</span>
                <input type="number" className={baseInput + ' w-20'} value={minSoles} min={0} onChange={e => setMinSoles(Number(e.target.value) || 0)} data-testid="rep-min" />
                <span className="pb-2">frente a su promedio del año.</span>
              </div>

              {candidates.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-semibold" data-testid="rep-sin-candidatos">
                  En {MES_NOMBRE[month]} no hay suministros de {serviceOf(utilityType)} con ahorro ni exceso significativo: no corresponde enviar memorando.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <p className="font-bold text-emerald-800 flex items-center gap-1.5"><Award className="w-4 h-4" /> Con AHORRO significativo ({ahorro.length}) → memorando de reconocimiento</p>
                    {ahorro.length ? ahorro.map(c => renderCard(c)) : <p className="text-slate-500">Ninguno.</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="font-bold text-red-800 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Con EXCESO significativo ({exceso.length}) → memorando de advertencia</p>
                    {exceso.length ? exceso.map(c => renderCard(c)) : <p className="text-slate-500">Ninguno.</p>}
                  </div>
                </div>
              )}

              {selected.length > 0 && (
                <div className="border border-slate-300 rounded-xl p-3 flex flex-col gap-2" data-testid="rep-form">
                  <p className="font-bold text-sm">
                    Memorando de {selKind === 'ahorro' ? 'RECONOCIMIENTO' : 'ADVERTENCIA'} – {selected.length} suministro(s). Si son de distintas áreas, haga un memorando por área.
                  </p>
                  <div className="grid md:grid-cols-2 gap-2">
                    <Field label="A: (área; escriba o elija de la lista)" value={para} set={setPara} list="areas-memo" testid="rep-para" error={faltaPara ? 'Falta el área: escriba a quién va dirigido el memorando (o elíjala de la lista) y vuelva a presionar "Generar".' : undefined} />
                    <Field label="De:" value={de} set={setDe} />
                    <Field label="N° de memorando" value={numero} set={setNumero} />
                    <Field label="Lugar y fecha" value={fecha} set={setFecha} />
                  </div>
                  <label className="flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-700">Asunto</span>
                    <input className={inputCls} value={asunto} onChange={e => setAsuntoEdit(e.target.value)} />
                  </label>
                  <div className="grid md:grid-cols-4 gap-2">
                    <Field label="Firma: nombre" value={firmaNombre} set={setFirmaNombre} />
                    <Field label="Cargo" value={firmaCargo} set={setFirmaCargo} />
                    <Field label="Unidad" value={firmaUnidad} set={setFirmaUnidad} />
                    <Field label="Iniciales" value={iniciales} set={setIniciales} />
                  </div>
                  <datalist id="areas-memo">
                    {AREAS_SUGERIDAS.map(a => <option key={a} value={a} />)}
                  </datalist>
                  <button
                    onClick={generateMemo}
                    disabled={busy}
                    className={`self-end px-4 py-2.5 rounded-xl text-white font-bold flex items-center gap-2 cursor-pointer ${selKind === 'ahorro' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-60`}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Generar memorando (Word)
                  </button>
                </div>
              )}
            </>
          )}

          {tab === 'analisis' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                Elija <strong>cualquier suministro</strong>, el <strong>mes</strong> y el <strong>año</strong>, aunque no aparezca como ahorro o exceso. Sale un informe en Word que
                explica la <strong>subida o bajada frente al mes anterior</strong>, la compara con el <strong>promedio</strong> y con los meses más alto y más bajo, muestra la
                historia del año con gráfico, verifica el registro y da recomendaciones.
              </div>
              <div className="flex flex-wrap items-end gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <label className="flex flex-col gap-0.5 flex-1 min-w-[260px]">
                  <span className={`font-semibold ${faltaSum ? 'text-red-700' : ''}`}>Suministro (escriba el N° o el nombre y elíjalo de la lista)</span>
                  <input
                    className={`${inputCls} ${faltaSum ? 'border-red-500 ring-2 ring-red-200 bg-red-50' : ''}`}
                    value={aText}
                    onChange={e => pickText(e.target.value)}
                    list="sum-analisis"
                    placeholder="Ej.: 71155141"
                    data-testid="an-sum"
                  />
                  <datalist id="sum-analisis">
                    {aList.map(r => (
                      <option key={r.id} value={optLabel(r)} />
                    ))}
                  </datalist>
                  {faltaSum && (
                    <span className="text-red-700 font-bold" data-testid="an-sum-error">
                      Falta el suministro: escriba el N° y elíjalo de la lista.
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="font-semibold">Mes</span>
                  <select className={baseInput + ' w-36'} value={aMonth} onChange={e => setAMonth(e.target.value as MonthKey)} data-testid="an-mes">
                    {MONTH_KEYS.map(m => (
                      <option key={m} value={m}>{MES_TITULO[m]}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="font-semibold">Año</span>
                  <select
                    className={baseInput + ' w-24'}
                    value={aYear}
                    onChange={e => {
                      setAYear(Number(e.target.value));
                      setARecId(null);
                      setAText('');
                    }}
                    data-testid="an-anio"
                  >
                    {(aYears.length ? aYears : [year]).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </label>
              </div>

              {aRec && !aOk && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 font-semibold text-amber-800" data-testid="an-sin-recibo">
                  {aRec.supplyNumber} no tiene recibo registrado en {MES_NOMBRE[aMonth]} de {aYear}. Elija otro mes.
                </div>
              )}

              {analisis && (
                <div
                  className={`rounded-xl p-3 border ${analisis.veredicto === 'exceso' ? 'bg-red-50 border-red-300' : analisis.veredicto === 'ahorro' ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-300'}`}
                  data-testid="an-resumen"
                >
                  <p className="font-bold text-sm mb-1">
                    {aRec?.supplyNumber} — {aRec?.propertyName} · {MES_TITULO[aMonth]} {aYear}: {fmtSol(analisis.stats.amount)} ({fmtNum(analisis.stats.consumption)} {unit})
                  </p>
                  {analisis.vsPrev && analisis.stats.prevMonth && (
                    <p>
                      Frente a <strong>{MES_NOMBRE[analisis.stats.prevMonth]}</strong> ({fmtSol(analisis.stats.prevAmount)}, {fmtNum(analisis.stats.prevConsumption)} {unit}): monto{' '}
                      <strong>{solS(analisis.vsPrev.dAmt)} ({pctS(analisis.vsPrev.pAmt)})</strong> · consumo {pctS(analisis.vsPrev.pCons)}
                    </p>
                  )}
                  {analisis.vsAvg && analisis.stats.monthsInAvg > 0 && (
                    <p>
                      Frente al <strong>promedio</strong> de {analisis.stats.monthsInAvg} meses anteriores ({fmtSol(analisis.stats.avgAmount)}, {fmtNum(analisis.stats.avgConsumption)} {unit}): monto{' '}
                      <strong>{solS(analisis.vsAvg.dAmt)} ({pctS(analisis.vsAvg.pAmt)})</strong> · consumo {pctS(analisis.vsAvg.pCons)}
                    </p>
                  )}
                  {analisis.prevNivel === 'bajo' && analisis.stats.prevMonth && (
                    <p className="text-slate-700">{MES_TITULO[analisis.stats.prevMonth]} fue un mes <strong>bajo</strong> para este predio.</p>
                  )}
                  <p className={`font-bold mt-1 ${analisis.veredicto === 'exceso' ? 'text-red-700' : analisis.veredicto === 'ahorro' ? 'text-emerald-700' : 'text-blue-800'}`} data-testid="an-veredicto">
                    {analisis.veredicto === 'exceso'
                      ? 'Resultado: POR ENCIMA de lo habitual (exceso significativo).'
                      : analisis.veredicto === 'ahorro'
                        ? 'Resultado: POR DEBAJO de lo habitual (ahorro significativo).'
                        : analisis.veredicto === 'normal'
                          ? 'Resultado: DENTRO de lo habitual para este predio.'
                          : 'Resultado: faltan meses anteriores para comparar.'}
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-2">
                <Field label="A:" value={aPara} set={setAPara} list="areas-memo" />
                <Field label="De:" value={aDe} set={setADe} />
                <Field label="N° de informe" value={aNumero} set={setANumero} />
                <Field label="Lugar y fecha" value={aFecha} set={setAFecha} />
              </div>
              <label className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-700">Asunto</span>
                <input className={inputCls} value={aAsunto} onChange={e => setAAsuntoEdit(e.target.value)} />
              </label>
              <div className="grid md:grid-cols-4 gap-2">
                <Field label="Firma: nombre" value={aFirmaNombre} set={setAFirmaNombre} />
                <Field label="Cargo" value={aFirmaCargo} set={setAFirmaCargo} />
                <Field label="Unidad" value={aFirmaUnidad} set={setAFirmaUnidad} />
                <Field label="Iniciales" value={aIniciales} set={setAIniciales} />
              </div>
              <datalist id="areas-memo">
                {AREAS_SUGERIDAS.map(a => <option key={a} value={a} />)}
              </datalist>
              <button
                onClick={generateAnalisis}
                disabled={busy || (!!aRec && !aOk)}
                className="self-end px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Generar análisis (Word)
              </button>
            </>
          )}

          {tab === 'informe' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                Un solo documento con <strong>Energía eléctrica primero y Agua potable después</strong> (sale igual desde la ventana de Energía o de Agua): resumen,
                evolución mensual con gráfico, gasto por suministro, ahorros y excesos significativos, observaciones y conclusiones.
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                  {(['mensual', 'semestral', 'anual'] as const).map(t => (
                    <button key={t} onClick={() => setPType(t)} className={`px-3 py-1.5 font-semibold cursor-pointer ${pType === t ? 'bg-blue-600 text-white' : 'bg-white hover:bg-slate-50'}`}>
                      {t === 'mensual' ? 'Mensual' : t === 'semestral' ? 'Semestral' : 'Anual'}
                    </button>
                  ))}
                </div>
                {pType === 'mensual' && (
                  <select className={baseInput + ' w-40'} value={pMonth} onChange={e => setPMonth(Number(e.target.value))} data-testid="inf-mes">
                    {MONTH_KEYS.map((m, i) => (
                      <option key={m} value={i}>{MES_TITULO[m]} {year}</option>
                    ))}
                  </select>
                )}
                {pType === 'semestral' && (
                  <select className={baseInput + ' w-56'} value={pSem} onChange={e => setPSem(Number(e.target.value))}>
                    <option value={0}>Primer semestre (enero – junio)</option>
                    <option value={1}>Segundo semestre (julio – diciembre)</option>
                  </select>
                )}
                <span className="pb-2 font-semibold">{periodLabel(period, year)}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                <Field label="A:" value={iPara} set={setIPara} />
                <Field label="De:" value={iDe} set={setIDe} />
                <Field label="N° de informe / memorando" value={iNumero} set={setINumero} />
                <Field label="Lugar y fecha" value={iFecha} set={setIFecha} />
              </div>
              <div className="grid md:grid-cols-4 gap-2">
                <Field label="Firma: nombre" value={iFirmaNombre} set={setIFirmaNombre} />
                <Field label="Cargo" value={iFirmaCargo} set={setIFirmaCargo} />
                <Field label="Unidad" value={iFirmaUnidad} set={setIFirmaUnidad} />
                <Field label="Iniciales" value={iIniciales} set={setIIniciales} />
              </div>
              <button
                onClick={generateInforme}
                disabled={busy}
                className="self-end px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileBarChart className="w-4 h-4" />} Generar informe (Word)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
