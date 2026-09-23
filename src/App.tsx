import React, { useState, useEffect } from 'react';
import { SupplyRecord, UtilityType, UserRole, FilterState } from './types';
import { ChartsSection } from './components/ChartsSection';
import { DataTableSection } from './components/DataTableSection';
import { SupplyModal } from './components/SupplyModal';
import { ReceiptModal } from './components/ReceiptModal';
import { Zap, Droplet, User, ShieldCheck, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

const STORAGE_KEY = 'infradash_supply_records_v1';

const initialDefaultRecords: SupplyRecord[] = [
  {
    id: '1',
    utilityType: 'energy',
    supplyNumber: 'SUM-88412',
    propertyName: 'Vivienda Punta Arenas 01',
    address: 'Punta Arenas 01',
    category: 'Talara',
    receiptNumber: 'REC-2026-001',
    consumption: 320,
    months: { ene: 150, feb: 160, mar: 155, abr: 170, may: 165, jun: 180, jul: 190, ago: 185, set: 175, oct: 160, nov: 155, dic: 195 },
    totalAmount: 2000,
    year: 2026,
    debtMonths: [],
    status: 'active'
  } as any,
  {
    id: '2',
    utilityType: 'water',
    supplyNumber: 'WAT-55102',
    propertyName: 'Vivienda Punta Arenas 02',
    address: 'Punta Arenas 02',
    category: 'Talara Alta',
    receiptNumber: 'REC-2026-002',
    consumption: 45,
    months: { ene: 40, feb: 42, mar: 38, abr: 45, may: 44, jun: 46, jul: 50, ago: 48, set: 42, oct: 41, nov: 39, dic: 52 },
    totalAmount: 529,
    year: 2026,
    debtMonths: [],
    status: 'active'
  } as any
];

export default function App() {
  const [utilityType, setUtilityType] = useState<UtilityType>('energy');
  const [role, setRole] = useState<any>('admin');

  // Inicializar registros desde localStorage o usando los datos por defecto
  const [records, setRecords] = useState<SupplyRecord[]>(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (e) {
      console.error('Error al cargar localStorage:', e);
    }
    return initialDefaultRecords;
  });

  // Guardar automáticamente en localStorage ante cualquier cambio (a prueba de cortes)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Error al guardar en localStorage:', e);
    }
  }, [records]);

  const [filters, setFilters] = useState<any>({ search: '', category: 'ALL' });
  const [toast, setToast] = useState<{ title: string; message: string; type: 'success' | 'warning' | 'info' | 'error' } | null>(null);

  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<SupplyRecord | null>(null);

  // Estados para el Modal de Recibos Inteligentes
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptRecord, setSelectedReceiptRecord] = useState<SupplyRecord | null>(null);
  const [activeMonthForReceipt, setActiveMonthForReceipt] = useState<string>('jul');

  const showToast = (title: string, message: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveRecord = (savedRecord: SupplyRecord) => {
    setRecords(prev => {
      const exists = prev.some(r => r.id === savedRecord.id);
      if (exists) {
        return prev.map(r => r.id === savedRecord.id ? savedRecord : r);
      } else {
        return [savedRecord, ...prev];
      }
    });
    showToast('Guardado', `Suministro ${savedRecord.supplyNumber} actualizado correctamente.`, 'success');
  };

  const handleDeleteRecord = (record: SupplyRecord) => {
    if (confirm(`¿Está seguro de eliminar el suministro ${record.supplyNumber}?`)) {
      setRecords(prev => prev.filter(r => r.id !== record.id));
      showToast('Eliminado', `Suministro ${record.supplyNumber} eliminado correctamente.`, 'info');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#191c1e] flex flex-col font-sans antialiased">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-slide-up text-xs">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
          <div>
            <p className="font-bold">{toast.title}</p>
            <p className="text-slate-300">{toast.message}</p>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-[#cbd5e1] px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#004ac6] text-white p-2 rounded-xl shadow-sm">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-base text-[#191c1e]">Control de Suministros y Servicios (Infradash)</h1>
              <p className="text-xs text-[#434655]">Gestión y Facturación de Viviendas - Punta Arenas / Talara</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs">
              <button
                onClick={() => setRole('admin')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  role === 'admin' ? 'bg-white text-[#004ac6] shadow-xs' : 'text-[#434655] hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Admin
              </button>
              <button
                onClick={() => setRole('viewer')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  role === 'viewer' ? 'bg-white text-[#004ac6] shadow-xs' : 'text-[#434655] hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" /> Lector
              </button>
            </div>

            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs">
              <button
                onClick={() => setUtilityType('energy')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  utilityType === 'energy' ? 'bg-[#004ac6] text-white shadow-xs' : 'text-[#434655] hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> Energía
              </button>
              <button
                onClick={() => setUtilityType('water')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  utilityType === 'water' ? 'bg-[#00687a] text-white shadow-xs' : 'text-[#434655] hover:text-slate-900'
                }`}
              >
                <Droplet className="w-3.5 h-3.5" /> Agua
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 flex-1 w-full flex flex-col gap-6">
        <ChartsSection
          utilityType={utilityType}
          records={records.filter(r => r.utilityType === utilityType)}
          onShowToast={showToast}
        />

        <DataTableSection
          records={records}
          utilityType={utilityType}
          role={role}
          filters={filters}
          setFilters={setFilters}
          onShowToast={showToast}
          onOpenNewModal={() => {
            setRecordToEdit(null);
            setIsSupplyModalOpen(true);
          }}
          onOpenEditModal={(rec) => {
            setRecordToEdit(rec);
            setIsSupplyModalOpen(true);
          }}
          onOpenDeleteModal={handleDeleteRecord}
          onOpenReceiptModal={(rec) => {
            setSelectedReceiptRecord(rec);
            setActiveMonthForReceipt((rec as any).selectedMonth || 'jul');
            setIsReceiptModalOpen(true);
          }}
        />
      </main>

      {/* Modal para Crear / Editar Suministro */}
      <SupplyModal
        isOpen={isSupplyModalOpen}
        onClose={() => setIsSupplyModalOpen(false)}
        onSave={handleSaveRecord}
        recordToEdit={recordToEdit}
        utilityType={utilityType}
        onShowToast={showToast}
      />

      {/* Modal Inteligente de Recibos por Mes */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        record={selectedReceiptRecord}
        activeMonthView={activeMonthForReceipt}
        utilityType={utilityType}
        onShowToast={showToast}
      />
    </div>
  );
}