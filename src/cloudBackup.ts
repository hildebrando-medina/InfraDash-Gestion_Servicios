import { SupplyRecord } from './types';
import { MONTH_KEYS, MONTH_FULL_NAMES, buildMonthlyDetailsForForm, hasMonthlyDetails } from './recordUtils';

// ============================================================
// Respaldo en la nube (carpeta de OneDrive / SharePoint sincronizada)
// InfraDash escribe archivos en una carpeta de la computadora que el
// programa OneDrive de Windows sube solo a SharePoint (INFRADASH_DATOS).
// ============================================================

export const BACKUP_FILE = 'infradash-ultimo.json';
export const CSV_FILE = 'infradash-datos.csv';
export const HISTORY_DIR = 'historial';
export const LAST_BACKUP_KEY = 'infradash_ultimo_respaldo';
export const CONSULT_MODE_KEY = 'infradash_modo_consulta';
export const SAFETY_COPY_KEY = 'infradash_copia_antes_de_importar';
// Días sin respaldo antes de mostrar el recordatorio
export const REMINDER_DAYS = 2;

const DB_NAME = 'infradash_nube';
const DB_STORE = 'carpeta';
const DB_KEY = 'respaldo';

export interface BackupPayload {
  app: 'InfraDash';
  version: 1;
  createdAt: string;
  totalRecords: number;
  records: SupplyRecord[];
}

export interface ConsultInfo {
  importedAt: string;
  backupAt: string;
}

export const isFolderApiSupported = (): boolean =>
  typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';

// ---------- IndexedDB: recordar la carpeta elegida ----------
const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const idb = async (mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<any> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, mode);
    const req = fn(tx.objectStore(DB_STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const getSavedFolder = async (): Promise<any | null> => {
  try {
    return (await idb('readonly', s => s.get(DB_KEY))) || null;
  } catch {
    return null;
  }
};

const saveFolder = async (handle: any) => idb('readwrite', s => s.put(handle, DB_KEY));
export const forgetFolder = async () => idb('readwrite', s => s.delete(DB_KEY));

// Abre la ventana de Windows para elegir la carpeta (una sola vez)
export const chooseFolder = async (mode: 'read' | 'readwrite'): Promise<any> => {
  const handle = await (window as any).showDirectoryPicker({ id: 'infradash-nube', mode });
  await saveFolder(handle);
  return handle;
};

// ¿Tiene permiso sobre la carpeta? Con request=true lo pide (requiere un clic)
export const hasPermission = async (handle: any, mode: 'read' | 'readwrite', request: boolean): Promise<boolean> => {
  if (!handle) return false;
  if (typeof handle.queryPermission !== 'function') return true;
  const opts = { mode };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  if (!request) return false;
  return (await handle.requestPermission(opts)) === 'granted';
};

// ---------- Contenido de los archivos ----------
export const buildPayload = (records: SupplyRecord[]): BackupPayload => ({
  app: 'InfraDash',
  version: 1,
  createdAt: new Date().toISOString(),
  totalRecords: records.length,
  records
});

const csvCell = (v: unknown): string => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Una fila por suministro y mes con datos (para Excel y el futuro agente IA)
export const buildCsv = (records: SupplyRecord[]): string => {
  const header = ['Servicio', 'Unidad', 'Suministro', 'Predio', 'Categoria', 'Anio', 'Mes', 'N_Recibo', 'Lectura_Anterior', 'Lectura_Actual', 'Consumo', 'Monto_Soles'];
  const rows: string[] = [header.join(';')];
  records.forEach(r => {
    const details = buildMonthlyDetailsForForm(r);
    MONTH_KEYS.forEach(m => {
      const d = details[m];
      const has = d.amount > 0 || d.consumption > 0 || (d.receipt || '') !== '';
      if (!has) return;
      rows.push(
        [
          r.utilityType === 'energy' ? 'Energia' : 'Agua',
          r.utilityType === 'energy' ? 'kW-h' : 'm3',
          r.supplyNumber,
          r.propertyName || r.address || '',
          r.category || '',
          r.year || 2026,
          MONTH_FULL_NAMES[m],
          d.receipt,
          hasMonthlyDetails(r) ? d.previousReading : '',
          hasMonthlyDetails(r) ? d.currentReading : '',
          hasMonthlyDetails(r) ? d.consumption : '',
          d.amount.toFixed(2)
        ]
          .map(csvCell)
          .join(';')
      );
    });
  });
  return '﻿' + rows.join('\r\n');
};

const pad = (n: number) => String(n).padStart(2, '0');
export const dayStamp = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const minuteStamp = (d = new Date()) => `${dayStamp(d)}-${pad(d.getHours())}${pad(d.getMinutes())}`;

const writeText = async (dir: any, name: string, text: string) => {
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(text);
  await w.close();
};

// Valida y convierte el texto de un respaldo
export const parseBackup = (text: string): BackupPayload => {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un respaldo válido de InfraDash (no se pudo leer).');
  }
  const records = Array.isArray(data) ? data : data?.records;
  if (!Array.isArray(records)) throw new Error('El archivo no contiene suministros de InfraDash.');
  const bad = records.find(
    (r: any) => !r || typeof r !== 'object' || !r.id || !r.supplyNumber || (r.utilityType !== 'energy' && r.utilityType !== 'water')
  );
  if (bad) throw new Error('El archivo tiene suministros incompletos; no se puede usar.');
  return {
    app: 'InfraDash',
    version: 1,
    createdAt: (data && data.createdAt) || '',
    totalRecords: records.length,
    records
  };
};

// Lee el respaldo actual de la carpeta (null si todavía no existe)
export const readBackupFromFolder = async (dir: any): Promise<BackupPayload | null> => {
  let fh: any;
  try {
    fh = await dir.getFileHandle(BACKUP_FILE);
  } catch {
    return null;
  }
  const file = await fh.getFile();
  return parseBackup(await file.text());
};

export const readBackupFromFile = async (file: File): Promise<BackupPayload> => parseBackup(await file.text());

export type WriteResult =
  | { ok: true; at: string }
  | { ok: false; reason: 'menos-datos'; local: number; nube: number };

// Escribe el respaldo. Por seguridad NO reemplaza un respaldo de la nube
// que tenga muchos más suministros que este equipo (salvo force=true).
export const writeBackup = async (dir: any, records: SupplyRecord[], force = false): Promise<WriteResult> => {
  if (!force) {
    try {
      const current = await readBackupFromFolder(dir);
      if (current && current.totalRecords >= 4 && records.length < current.totalRecords * 0.5) {
        return { ok: false, reason: 'menos-datos', local: records.length, nube: current.totalRecords };
      }
    } catch {
      // Si el archivo de la nube está dañado, se reemplaza con los datos buenos de este equipo
    }
  }
  const payload = buildPayload(records);
  const json = JSON.stringify(payload, null, 1);
  await writeText(dir, BACKUP_FILE, json);
  const hist = await dir.getDirectoryHandle(HISTORY_DIR, { create: true });
  await writeText(hist, `infradash-respaldo-${dayStamp()}.json`, json);
  await writeText(dir, CSV_FILE, buildCsv(records));
  return { ok: true, at: payload.createdAt };
};

// Descarga un archivo al equipo (copia de seguridad antes de importar)
export const downloadText = (name: string, text: string, type = 'application/json') => {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export const summarize = (records: SupplyRecord[]) => {
  const energy = records.filter(r => r.utilityType === 'energy').length;
  const water = records.filter(r => r.utilityType === 'water').length;
  return { total: records.length, energy, water };
};

export const fmtDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const ago = (iso: string | null | undefined): string => {
  if (!iso) return 'nunca';
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms)) return 'nunca';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  return `hace ${days} día${days === 1 ? '' : 's'}`;
};

export const daysSince = (iso: string | null | undefined): number => {
  if (!iso) return Infinity;
  const ms = Date.now() - new Date(iso).getTime();
  return isNaN(ms) ? Infinity : ms / 86400000;
};

export const safeGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const safeSet = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* sin acceso a almacenamiento */
  }
};

export const getConsultInfo = (): ConsultInfo | null => {
  const raw = safeGet(CONSULT_MODE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
