import React, { useState, useEffect } from 'react';
import { UtilityType, UserRole, SupplyRecord, FilterState, ToastMessage } from './types';
import { INITIAL_ENERGY_RECORDS, INITIAL_WATER_RECORDS } from './data/mockData';
import { TopAppBar } from './components/TopAppBar';
import { BottomNavBar } from './components/BottomNavBar';
import { KPIGrid } from './components/KPIGrid';
import { ChartsSection } from './components/ChartsSection';
import { DataTableSection } from './components/DataTableSection';
import { RecordModal } from './components/RecordModal';
import { ReceiptModal } from './components/ReceiptModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { FilterModal } from './components/FilterModal';
import { ToastContainer } from './components/Toast';
import { RotateCcw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<UtilityType>('energy');
  const [role, setRole] = useState<UserRole>('admin');

  // Stored Records for Energy and Water (Persistencia intacta)
  const [energyRecords, setEnergyRecords] = useState<SupplyRecord[]>(() => {
    try {
      const saved = localStorage.getItem('infradash_energy_records');
      return saved ? JSON.parse(saved) : INITIAL_ENERGY_RECORDS;
    } catch {
      return INITIAL_ENERGY_RECORDS;
    }
  });

  const [waterRecords, setWaterRecords] = useState<SupplyRecord[]>(() => {
    try {
      const saved = localStorage.getItem('infradash_water_records');
      return saved ? JSON.parse(saved) : INITIAL_WATER_RECORDS;
    } catch {
      return INITIAL_WATER_RECORDS;
    }
  });

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    year: 'all',
    debtFilter: 'all',
    categoryFilter: 'all',
    statusFilter: 'all'
  });

  // Modal States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SupplyRecord | null>(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptRecord, setSelectedReceiptRecord] = useState<SupplyRecord | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<SupplyRecord | null>(null);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('infradash_energy_records', JSON.stringify(energyRecords));
    } catch {}
  }, [energyRecords]);

  useEffect(() => {
    try {
      localStorage.setItem('infradash_water_records', JSON.stringify(waterRecords));
    } catch {}
  }, [waterRecords]);

  const showToast = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const rawRecords = activeTab === 'energy' ? energyRecords : waterRecords;

  // ==========================================
  // MOTOR DE FILTRADO AVANZADO Y BÚSQUEDA
  // ==========================================
  const currentRecords = rawRecords.filter(record => {
    // 1. Filtro por Año de Ejercicio Fiscal
    if (filters.year !== 'all' && Number(record.year) !== Number(filters.year)) {
      return false;
    }

    // 2. Filtro por Estado Operativo (Activos / Inactivos)
    if (filters.statusFilter !== 'all' && record.status !== filters.statusFilter) {
      return false;
    }

    // 3. Filtro por Estado de Deuda / Morosidad
    if (filters.debtFilter === 'with_debt' && (!record.debtMonths || record.debtMonths <= 0)) {
      return false;
    }
    if (filters.debtFilter === 'no_debt' && record.debtMonths && record.debtMonths > 0) {
      return false;
    }

    // 4. Filtro por Categoría de Instalación
    if (filters.categoryFilter !== 'all' && record.category !== filters.categoryFilter) {
      return false;
    }

    // 5. Filtro de Búsqueda por texto (Suministro, Predio, Recibo, etc.)
    if (filters.search && filters.search.trim() !== '') {
      const query = filters.search.toLowerCase();
      const matchSupply = record.supplyNumber?.toLowerCase().includes(query);
      const matchProperty = record.propertyName?.toLowerCase().includes(query);
      const matchReceipt = record.receiptNumber?.toLowerCase().includes(query);
      const matchCategory = record.category?.toLowerCase().includes(query);
      if (!matchSupply && !matchProperty && !matchReceipt && !matchCategory) {
        return false;
      }
    }

    return true;
  });

  // CRUD Actions
  const handleSaveRecord = (record: SupplyRecord) => {
    if (activeTab === 'energy') {
      setEnergyRecords(prev => {
        const index = prev.findIndex(r => r.id === record.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = record;
          return updated;
        } else {
          return [record, ...prev];
        }
      });
    } else {
      setWaterRecords(prev => {
        const index = prev.findIndex(r => r.id === record.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = record;
          return updated;
        } else {
          return [record, ...prev];
        }
      });
    }

    showToast(
      'Registro Guardado',
      `Suministro ${record.supplyNumber} (${record.propertyName}) actualizado con éxito.`,
      'success'
    );
  };

  const handleDeleteRecord = () => {
    if (!deletingRecord) return;
    if (activeTab === 'energy') {
      setEnergyRecords(prev => prev.filter(r => r.id !== deletingRecord.id));
    } else {
      setWaterRecords(prev => prev.filter(r => r.id !== deletingRecord.id));
    }

    showToast(
      'Registro Eliminado',
      `El suministro ${deletingRecord.supplyNumber} ha sido removido del sistema.`,
      'warning'
    );
    setDeletingRecord(null);
  };

  const handleResetDemoData = () => {
    setEnergyRecords(INITIAL_ENERGY_RECORDS);
    setWaterRecords(INITIAL_WATER_RECORDS);
    setFilters({
      search: '',
      year: 'all',
      debtFilter: 'all',
      categoryFilter: 'all',
      statusFilter: 'all'
    });
    showToast(
      'Datos Restaurados',
      'Se han reinicializado todos los registros a su estado original de fábrica.',
      'info'
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#191c1e] flex flex-col font-sans">
      {/* Top Application Bar with Brand, Tabs and Role Toggle */}
      <TopAppBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={role}
        setRole={setRole}
        onShowToast={showToast}
      />

      {/* Main Canvas Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 pb-24 md:pb-8 flex flex-col gap-5">
        {/* Page Title & Main Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-3 h-3 rounded-full ${activeTab === 'energy' ? 'bg-[#004ac6]' : 'bg-[#00687a]'}`}></span>
              <h1 className="text-2xl font-bold tracking-tight text-[#191c1e]">
                {activeTab === 'energy' ? 'Consumo de Energía (Luz)' : 'Consumo de Agua'}
              </h1>
            </div>
            <p className="text-xs text-[#434655]">
              {activeTab === 'energy'
                ? 'Vista general operativa de gastos eléctricos y predios corporativos.'
                : 'Gestión y análisis de gasto hídrico e instalaciones.'}
            </p>
          </div>

          {/* Quick actions row */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={handleResetDemoData}
              className="px-3 py-1.5 bg-white border border-[#cbd5e1] hover:bg-[#f1f5f9] text-[#434655] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Restablecer datos demo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restablecer Datos</span>
            </button>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <KPIGrid
          utilityType={activeTab}
          records={currentRecords}
        />

        {/* Dynamic Interactive Charts */}
        <ChartsSection
          utilityType={activeTab}
          records={currentRecords}
          onShowToast={showToast}
        />

        {/* Data Table with Search, Column Export, Filters and Actions */}
        <DataTableSection
          utilityType={activeTab}
          role={role}
          records={currentRecords}
          filters={filters}
          setFilters={setFilters}
          onOpenNewModal={() => {
            setEditingRecord(null);
            setIsRecordModalOpen(true);
          }}
          onOpenEditModal={(record) => {
            setEditingRecord(record);
            setIsRecordModalOpen(true);
          }}
          onOpenDeleteModal={(record) => {
            setDeletingRecord(record);
            setIsDeleteModalOpen(true);
          }}
          onOpenReceiptModal={(record) => {
            setSelectedReceiptRecord(record);
            setIsReceiptModalOpen(true);
          }}
          onOpenFilterModal={() => setIsFilterModalOpen(true)}
          onShowToast={showToast}
        />
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Toast Notification Stack */}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
      />

      {/* Record Creation / Editing Modal */}
      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
        editingRecord={editingRecord}
        utilityType={activeTab}
      />

      {/* Digital Receipt Voucher Modal (Con Lectura Anterior, Lectura Actual y Datos Reales) */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedReceiptRecord(null);
        }}
        record={selectedReceiptRecord}
        utilityType={activeTab}
        onShowToast={showToast}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingRecord(null);
        }}
        onConfirm={handleDeleteRecord}
        record={deletingRecord}
      />

      {/* Advanced Filters Dialog */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        setFilters={setFilters}
        onReset={() => {
          setFilters({
            search: '',
            year: 'all',
            debtFilter: 'all',
            categoryFilter: 'all',
            statusFilter: 'all'
          });
          showToast('Filtros Restablecidos', 'Se muestran todos los registros disponibles.', 'info');
        }}
      />
    </div>
  );
}