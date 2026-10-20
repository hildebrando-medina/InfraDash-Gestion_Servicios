import React, { useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, CloudUpload, CloudDownload, RefreshCw, FolderOpen, FileUp, X, AlertTriangle, Eye, PencilLine } from 'lucide-react';
import { SupplyRecord } from '../types';
import {
  BackupPayload,
  ConsultInfo,
  LAST_BACKUP_KEY,
  LAST_SIG_KEY,
  ago,
  chooseFolder,
  dataSignature,
  fmtDateTime,
  getSavedFolder,
  hasPermission,
  isFolderApiSupported,
  readBackupFromFile,
  readBackupFromFolder,
  safeGet,
  safeSet,
  summarize,
  writeBackup
} from '../cloudBackup';

export type ImportMode = 'consulta' | 'registro';

interface CloudBackupBarProps {
  records: SupplyRecord[];
  // true cuando el equipo solo tiene los datos de ejemplo (nunca se suben)
  isSampleOnly: boolean;
  consultInfo: ConsultInfo | null;
  onImport: (payload: BackupPayload, mode: ImportMode) => void;
  onExitConsult: () => void;
  onShowToast: (title: string, message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'error'; message: string }
  | { kind: 'blocked'; local: number; nube: number }
  | { kind: 'stale'; nubeAt: string }
  | { kind: 'sin-datos' };

const AUTO_DELAY_MS = 3000;

export function CloudBackupBar({ records, isSampleOnly, consultInfo, onImport, onExitConsult, onShowToast }: CloudBackupBarProps) {
  const supported = isFolderApiSupported();
  const [folder, setFolder] = useState<any>(null);
  const [permitted, setPermitted] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(() => safeGet(LAST_BACKUP_KEY));
  const [save, setSave] = useState<SaveState>({ kind: 'idle' });
  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState<BackupPayload | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Mensaje visible cuando la configuración no se completa (siempre se explica el motivo)
  const [setupMsg, setSetupMsg] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const isConsult = !!consultInfo;

  // Al abrir: recuperar la carpeta elegida antes y ver si hay permiso
  useEffect(() => {
    let alive = true;
    (async () => {
      const h = await getSavedFolder();
      if (!alive || !h) return;
      setFolder(h);
      setPermitted(await hasPermission(h, isConsult ? 'read' : 'readwrite', false));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doBackup = async (force: boolean, handle = folder): Promise<boolean> => {
    if (!handle) return false;
    if (isSampleOnly || records.length === 0) {
      setSave({ kind: 'sin-datos' });
      return false;
    }
    setSave({ kind: 'saving' });
    try {
      const res = await writeBackup(handle, records, force, safeGet(LAST_BACKUP_KEY));
      if ('reason' in res) {
        if (res.reason === 'menos-datos') {
          console.warn('[InfraDash nube] Respaldo NO hecho: la nube tiene', res.nube, 'suministros y este equipo', res.local);
          setSave({ kind: 'blocked', local: res.local, nube: res.nube });
        } else {
          console.warn('[InfraDash nube] Respaldo NO hecho: la nube tiene datos más recientes de otro equipo/perfil:', res.nubeAt);
          setSave({ kind: 'stale', nubeAt: res.nubeAt });
        }
        return false;
      }
      console.info('[InfraDash nube] Respaldo hecho:', res.at, '-', records.length, 'suministros');
      safeSet(LAST_BACKUP_KEY, res.at);
      safeSet(LAST_SIG_KEY, dataSignature(records));
      setLastBackup(res.at);
      setSave({ kind: 'idle' });
      return true;
    } catch (e: any) {
      console.error('[InfraDash nube] Error al escribir el respaldo:', e?.name, e?.message);
      setSave({ kind: 'error', message: e?.message || 'No se pudo escribir en la carpeta.' });
      return false;
    }
  };

  // Respaldo AUTOMÁTICO: unos segundos después de cada cambio de datos.
  // Si los datos no cambiaron desde el último respaldo de este navegador, no se escribe nada
  // (la nube ya está al día y no se arriesga a reemplazarla).
  const sigNow = dataSignature(records);
  const upToDate = !!lastBackup && safeGet(LAST_SIG_KEY) === sigNow;
  useEffect(() => {
    if (isConsult || !folder || !permitted) return;
    if (safeGet(LAST_SIG_KEY) === dataSignature(records)) return;
    const t = setTimeout(() => {
      doBackup(false);
    }, AUTO_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, folder, permitted, isConsult]);

  // ---------- Botones de respaldo ----------
  const handleSetup = async () => {
    setSetupMsg(null);
    try {
      const h = await chooseFolder('readwrite');
      const name = String(h.name || '');
      if (!/infradash/i.test(name)) {
        const ok = confirm(
          `La carpeta elegida se llama "${name}".\nLa carpeta correcta es la de la nube: "GD Mantenimiento - INFRADASH_DATOS".\n\n¿Usar "${name}" de todos modos?`
        );
        if (!ok) {
          setSetupMsg(`No se configuró: decidió no usar la carpeta "${name}".`);
          return;
        }
      }
      // Confirma que Chrome dio permiso para guardar en la carpeta
      const allowed = await hasPermission(h, 'readwrite', true);
      console.info('[InfraDash nube] Permiso para guardar en la carpeta:', allowed);
      if (!allowed) {
        setSetupMsg(`No se configuró: Chrome no dio permiso para guardar en "${name}". Presione de nuevo y acepte "Editar archivos".`);
        return;
      }
      setFolder(h);
      setPermitted(true);
      const done = await doBackup(false, h);
      if (done) onShowToast('Respaldo activado', `Los datos se guardan solos en "${name}".`, 'success');
    } catch (e: any) {
      console.error('[InfraDash nube] No se configuró la carpeta:', e?.name, e?.message);
      if (e?.name === 'AbortError') {
        setSetupMsg('No se configuró: la ventana se cerró sin elegir carpeta (o se presionó Cancelar). Presione de nuevo "Respaldar en la nube".');
      } else {
        setSetupMsg(`No se configuró: ${e?.name || 'Error'} – ${e?.message || 'intente de nuevo'}.`);
      }
    }
  };

  const handleActivate = async () => {
    try {
      const ok = await hasPermission(folder, 'readwrite', true);
      setPermitted(ok);
      if (ok) {
        await doBackup(false);
        onShowToast('Respaldo activo', 'El respaldo automático quedó activado para esta sesión.', 'success');
      }
    } catch (e: any) {
      onShowToast('No se activó', e?.message || 'Intente de nuevo.', 'warning');
    }
  };

  const handleBackupNow = async (force = false) => {
    const done = await doBackup(force);
    if (done) onShowToast('Respaldo hecho', 'Los datos se guardaron en la carpeta de la nube.', 'success');
  };

  const handleForce = async () => {
    if (save.kind !== 'blocked' && save.kind !== 'stale') return;
    const first =
      save.kind === 'blocked'
        ? `La nube tiene ${save.nube} suministros y este equipo solo ${save.local}.\n\n`
        : `La nube fue actualizada el ${fmtDateTime(save.nubeAt)} desde otro equipo o perfil, con datos distintos a los de este navegador.\n\n`;
    const ok = confirm(
      first +
        'Si continúa, el respaldo de la nube se reemplazará con los datos de este navegador.\n' +
        '(La copia del día queda en la carpeta "historial").\n\nHágalo solo con autorización del administrador. ¿Está seguro?'
    );
    if (ok) await handleBackupNow(true);
  };

  // ---------- Actualizar desde la nube ----------
  const openImport = () => {
    setPreview(null);
    setImportError(null);
    setImportOpen(true);
  };

  const loadFromFolder = async () => {
    setImportError(null);
    setBusy(true);
    try {
      let h = folder;
      const mode = isConsult || !permitted ? 'read' : 'readwrite';
      if (!h || !(await hasPermission(h, mode as any, true))) {
        h = await chooseFolder('read');
        setFolder(h);
      }
      const data = await readBackupFromFolder(h);
      if (!data) {
        setImportError('En esa carpeta todavía no hay un respaldo de InfraDash (falta el archivo infradash-ultimo.json).');
      } else {
        setPreview(data);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') setImportError(e?.message || 'No se pudo leer la carpeta.');
    } finally {
      setBusy(false);
    }
  };

  const loadFromFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError(null);
    setBusy(true);
    try {
      setPreview(await readBackupFromFile(file));
    } catch (e: any) {
      setImportError(e?.message || 'No se pudo leer el archivo.');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const confirmImport = (mode: ImportMode) => {
    if (!preview) return;
    if (mode === 'registro') {
      const ok = confirm(
        'Solo use esta opción si ESTE equipo va a reemplazar a la computadora de registro (por ejemplo, la anterior se malogró).\n\n¿Continuar?'
      );
      if (!ok) return;
      // Este navegador queda al día con la nube: así no se considera "atrasado" al respaldar
      safeSet(LAST_BACKUP_KEY, preview.createdAt || new Date().toISOString());
      safeSet(LAST_SIG_KEY, dataSignature(preview.records));
      setLastBackup(preview.createdAt || new Date().toISOString());
      setSave({ kind: 'idle' });
    }
    onImport(preview, mode);
    setImportOpen(false);
    setPreview(null);
  };

  const local = summarize(records);

  // ---------- Barra según el estado ----------
  let bar: React.ReactNode;
  if (isConsult) {
    bar = (
      <div className="bg-blue-50 border border-blue-300 text-blue-900 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2" data-testid="nube-consulta">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 shrink-0" />
          <span>
            <strong>Modo consulta:</strong> datos de la nube del <strong>{fmtDateTime(consultInfo!.backupAt)}</strong> (traídos{' '}
            {ago(consultInfo!.importedAt)}). Este equipo no modifica ni sube datos.
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={openImport} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer">
            <CloudDownload className="w-4 h-4" /> Actualizar desde la nube
          </button>
          <button
            onClick={() => {
              if (confirm('¿Dejar el modo consulta? Hágalo solo si este equipo será usado para REGISTRAR recibos.')) onExitConsult();
            }}
            className="px-3 py-1.5 rounded-lg border border-blue-300 hover:bg-blue-100 font-semibold cursor-pointer"
          >
            Dejar modo consulta
          </button>
        </div>
      </div>
    );
  } else if (!supported) {
    bar = (
      <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <CloudOff className="w-4 h-4" /> Este navegador no permite el respaldo automático en carpeta. Use <strong>Google Chrome</strong> o <strong>Microsoft Edge</strong>.
        </span>
        <button onClick={openImport} className="px-3 py-1.5 rounded-lg border border-amber-400 hover:bg-amber-100 font-semibold flex items-center gap-1.5 cursor-pointer">
          <CloudDownload className="w-4 h-4" /> Actualizar desde la nube
        </button>
      </div>
    );
  } else if (!folder) {
    bar = (
      <div className="bg-red-50 border-2 border-red-400 text-red-900 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3" data-testid="nube-sin-configurar">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 text-sm">
            <CloudOff className="w-5 h-5 shrink-0" /> <strong>Respaldo en la nube: no configurado en este navegador.</strong>
          </span>
          <span data-testid="nube-aviso-navegador">
            <strong>Si esta es la laptop de registro:</strong> probablemente abrió InfraDash en <strong>otro perfil de Chrome u otro navegador</strong>.{' '}
            <strong>NO registre aquí</strong>: cierre esta ventana y abra InfraDash con el ícono <strong>INFRADASH REGISTRO</strong> del escritorio.
          </span>
          <span className="text-red-800">
            Si es un equipo nuevo, o del administrador o del jefe: use <strong>"Actualizar desde la nube"</strong>.
          </span>
          {setupMsg && (
            <span className="font-semibold text-red-700" data-testid="nube-setup-msg">
              {setupMsg}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleSetup} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer">
            <CloudUpload className="w-4 h-4" /> Respaldar en la nube
          </button>
          <button onClick={openImport} className="px-3 py-1.5 rounded-lg border border-amber-400 hover:bg-amber-100 font-semibold flex items-center gap-1.5 cursor-pointer">
            <CloudDownload className="w-4 h-4" /> Actualizar desde la nube
          </button>
        </div>
      </div>
    );
  } else if (!permitted) {
    bar = (
      <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2" data-testid="nube-activar">
        <span className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> Para seguir respaldando en <strong>"{folder.name}"</strong>, presione <strong>Activar respaldo</strong> (y en la ventana de Chrome elija <strong>"Permitir en cada visita"</strong>). Último respaldo: {ago(lastBackup)}{upToDate ? ' — los datos están al día en la nube' : ''}.
        </span>
        <button onClick={handleActivate} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer">
          <CloudUpload className="w-4 h-4" /> Activar respaldo
        </button>
      </div>
    );
  } else {
    const red = save.kind === 'error' || save.kind === 'blocked' || save.kind === 'stale';
    bar = (
      <div
        className={`${red ? 'bg-red-50 border-red-300 text-red-900' : 'bg-emerald-50 border-emerald-300 text-emerald-900'} border rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2`}
        data-testid="nube-activo"
      >
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <Cloud className="w-4 h-4 shrink-0" />
            <span>
              <strong>Respaldo automático activo</strong> en "{folder.name}" — último respaldo:{' '}
              <strong data-testid="nube-ultimo">{save.kind === 'saving' ? 'guardando…' : `${ago(lastBackup)} (${fmtDateTime(lastBackup)})`}</strong>
              {upToDate && save.kind === 'idle' && <span data-testid="nube-al-dia"> — los datos están al día en la nube.</span>}
            </span>
          </span>
          {save.kind === 'error' && <span className="font-semibold">No se pudo respaldar: {save.message}</span>}
          {save.kind === 'sin-datos' && <span className="font-semibold">No se respaldó: este equipo no tiene datos reales.</span>}
          {save.kind === 'blocked' && (
            <span className="font-semibold" data-testid="nube-bloqueado">
              No se respaldó: la nube tiene {save.nube} suministros y este equipo solo {save.local}. Si se perdieron datos, use "Actualizar desde la nube".{' '}
              <button onClick={handleForce} className="underline cursor-pointer">Respaldar de todos modos</button>
            </span>
          )}
          {save.kind === 'stale' && (
            <span className="font-semibold" data-testid="nube-atrasado">
              No se respaldó: la nube tiene datos guardados el {fmtDateTime(save.nubeAt)} desde otro equipo o perfil, distintos a los de este navegador. Si este no es el
              navegador de registro, ciérrelo y abra InfraDash con el ícono INFRADASH REGISTRO. Avise al administrador.{' '}
              <button onClick={handleForce} className="underline cursor-pointer">Respaldar de todos modos</button>
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => handleBackupNow(false)} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer">
            <RefreshCw className="w-4 h-4" /> Respaldar ahora
          </button>
          <button onClick={openImport} className="px-3 py-1.5 rounded-lg border border-emerald-400 hover:bg-emerald-100 font-semibold flex items-center gap-1.5 cursor-pointer">
            <CloudDownload className="w-4 h-4" /> Actualizar desde la nube
          </button>
          <button onClick={handleSetup} className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white font-semibold flex items-center gap-1.5 cursor-pointer" title="Elegir otra carpeta">
            <FolderOpen className="w-4 h-4" /> Cambiar carpeta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-xs">
      {bar}

      {importOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" role="dialog" aria-label="Actualizar desde la nube">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-xs">
            <div className="bg-slate-900 text-white px-5 py-3 flex justify-between items-center">
              <h2 className="font-bold text-sm flex items-center gap-2">
                <CloudDownload className="w-5 h-5" /> Actualizar desde la nube
              </h2>
              <button onClick={() => setImportOpen(false)} className="text-slate-400 hover:text-white cursor-pointer" title="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {!preview && (
                <>
                  <p>Elija de dónde traer los datos:</p>
                  {supported && (
                    <button onClick={loadFromFolder} disabled={busy} className="px-4 py-3 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-left cursor-pointer flex items-start gap-3">
                      <FolderOpen className="w-5 h-5 text-blue-700 shrink-0" />
                      <span>
                        <strong className="block">Desde la carpeta de la nube</strong>
                        "GD Mantenimiento - INFRADASH_DATOS" (OneDrive en este equipo).
                      </span>
                    </button>
                  )}
                  <button onClick={() => fileInput.current?.click()} disabled={busy} className="px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-left cursor-pointer flex items-start gap-3">
                    <FileUp className="w-5 h-5 text-slate-700 shrink-0" />
                    <span>
                      <strong className="block">Desde un archivo</strong>
                      El archivo <strong>infradash-ultimo.json</strong> descargado de SharePoint.
                    </span>
                  </button>
                  <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" data-testid="nube-archivo" onChange={e => loadFromFile(e.target.files?.[0])} />
                  {busy && <p>Leyendo…</p>}
                  {importError && <p className="text-red-700 font-semibold" data-testid="nube-error">{importError}</p>}
                </>
              )}

              {preview && (
                <>
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50" data-testid="nube-preview">
                    <p className="font-bold text-sm mb-1">Respaldo encontrado</p>
                    <p>
                      Fecha del respaldo: <strong>{fmtDateTime(preview.createdAt)}</strong> ({ago(preview.createdAt)})
                    </p>
                    <p>
                      Suministros en la nube: <strong>{preview.totalRecords}</strong> (Energía {summarize(preview.records).energy}, Agua{' '}
                      {summarize(preview.records).water})
                    </p>
                    <p>
                      Suministros ahora en este equipo: <strong>{local.total}</strong>
                    </p>
                  </div>
                  <p className="bg-amber-50 border border-amber-300 rounded-lg p-2 text-amber-900">
                    Los datos de este equipo se <strong>reemplazarán</strong> por los de la nube. Antes se descargará una <strong>copia de seguridad</strong> de lo que hay ahora.
                  </p>
                  <button onClick={() => confirmImport('consulta')} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 cursor-pointer">
                    <Eye className="w-4 h-4" /> Traer para CONSULTAR (administrador / jefe)
                  </button>
                  <button onClick={() => confirmImport('registro')} className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 font-semibold flex items-center justify-center gap-2 cursor-pointer">
                    <PencilLine className="w-4 h-4" /> Traer para SEGUIR REGISTRANDO (reemplaza la computadora de registro)
                  </button>
                  <button onClick={() => setPreview(null)} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer">
                    Volver
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
