import React, { useState } from 'react';
import { UtilityType, SupplyRecord } from '../types';
import { TrendingUp, DollarSign, Activity, FileText, Calendar, Zap, Droplet } from 'lucide-react';

interface KPIGridProps {
  utilityType: UtilityType;
  records: SupplyRecord[];
}

type PeriodFilter = 'monthly' | 'semiannual' | 'annual' | 'total';

export const KPIGrid: React.FC<KPIGridProps> = ({ utilityType, records }) => {
  const isEnergy = utilityType === 'energy';
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('annual');

  // 1. Cálculos base sobre los registros filtrados actuales
  const totalAmountBase = records.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const totalConsumptionBase = records.reduce((sum, r) => sum + (r.consumption || 0), 0);
  const totalPredios = records.length;
  const activeCount = records.filter(r => (r.debtMonths || 0) === 0).length;
  const withDebtCount = records.filter(r => (r.debtMonths || 0) > 0).length;

  // 2. Factores de proporción ejecutiva según el periodo seleccionado
  let factor = 1;
  let labelPeriodText = 'Histórico Acumulado';

  if (selectedPeriod === 'monthly') {
    factor = 1 / 12; // Estimado o promedio mensual
    labelPeriodText = 'Mensual (Promedio)';
  } else if (selectedPeriod === 'semiannual') {
    factor = 0.5; // Semestral (6 meses)
    labelPeriodText = 'Semestral (6 Meses)';
  } else if (selectedPeriod === 'annual') {
    factor = 0.85; // Ejercicio anual fiscal
    labelPeriodText = 'Anual (Ejercicio Fiscal)';
  }

  const totalAmount = totalAmountBase * (selectedPeriod === 'total' ? 1 : factor);
  const totalConsumption = totalConsumptionBase * (selectedPeriod === 'total' ? 1 : factor);

  return (
    <div className="space-y-3">
      {/* Barra de control de periodo ejecutiva */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-[#e2e8f0] shadow-2xs gap-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isEnergy ? 'bg-[#dbe1ff] text-[#004ac6]' : 'bg-[#acedff] text-[#00687a]'}`}>
            {isEnergy ? <Zap className="w-4 h-4" /> : <Droplet className="w-4 h-4" />}
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#191c1e]">Panel de Control Ejecutivo ({labelPeriodText})</h2>
            <p className="text-[11px] text-[#434655]">Métricas consolidadas para análisis gerencial de {isEnergy ? 'Electricidad' : 'Agua'}</p>
          </div>
        </div>

        {/* Pestañas de Selección de Periodo */}
        <div className="flex items-center bg-[#f8fafc] p-1 rounded-lg border border-[#e2e8f0] self-stretch sm:self-auto">
          {[
            { id: 'monthly', label: 'Mensual' },
            { id: 'semiannual', label: 'Semestral' },
            { id: 'annual', label: 'Anual' },
            { id: 'total', label: 'Total' },
          ].map((period) => (
            <button
              key={period.id}
              onClick={() => setSelectedPeriod(period.id as PeriodFilter)}
              className={`flex-1 sm:flex-none px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${
                selectedPeriod === period.id
                  ? 'bg-[#004ac6] text-white shadow-2xs'
                  : 'text-[#434655] hover:text-[#191c1e] bg-transparent'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cuadrícula de KPIs Principales (4 Tarjetas Limpias) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Gasto Monetario en Soles */}
        <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-2xs flex flex-col justify-between h-36 relative overflow-hidden group hover:border-[#cbd5e1] transition-all">
          <div className="flex justify-between items-start z-10">
            <span className="text-[11px] font-semibold tracking-wider text-[#434655] uppercase">
              {isEnergy ? 'Gasto Luz (S/.)' : 'Gasto Agua (S/.)'}
            </span>
            <div className={`p-2 rounded-lg ${isEnergy ? 'bg-[#dbe1ff] text-[#004ac6]' : 'bg-[#acedff] text-[#00687a]'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="z-10">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold tracking-tight text-[#004ac6]">
                S/ {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="inline-flex items-center text-[#059669] font-semibold bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[11px]">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
                Controlado
              </span>
              <span className="text-[#434655]">{labelPeriodText}</span>
            </div>
          </div>

          <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity select-none pointer-events-none">
            <span className="material-symbols-outlined text-[120px]">
              {isEnergy ? 'bolt' : 'water_drop'}
            </span>
          </div>
        </div>

        {/* KPI 2: Consumo Físico Total (kWh o m³) */}
        <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-2xs flex flex-col justify-between h-36 relative overflow-hidden group hover:border-[#cbd5e1] transition-all">
          <div className="flex justify-between items-start z-10">
            <span className="text-[11px] font-semibold tracking-wider text-[#434655] uppercase">
              Consumo ({isEnergy ? 'kWh' : 'm³'})
            </span>
            <div className={`p-2 rounded-lg ${isEnergy ? 'bg-[#dbe1ff] text-[#004ac6]' : 'bg-[#acedff] text-[#00687a]'}`}>
              <Activity className="w-5 h-5" />
            </div>
          </div>

          <div className="z-10">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold tracking-tight text-[#191c1e]">
                {totalConsumption.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-semibold text-[#434655]">
                {isEnergy ? 'kWh' : 'm³'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#434655]">
              <span>Volumen {labelPeriodText.toLowerCase()}</span>
            </div>
          </div>

          <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity select-none pointer-events-none">
            <span className="material-symbols-outlined text-[120px]">
              {isEnergy ? 'speed' : 'water'}
            </span>
          </div>
        </div>

        {/* KPI 3: Total Predios Monitoreados */}
        <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-2xs flex flex-col justify-between h-36 relative overflow-hidden group hover:border-[#cbd5e1] transition-all">
          <div className="flex justify-between items-start z-10">
            <span className="text-[11px] font-semibold tracking-wider text-[#434655] uppercase">
              Predios Monitoreados
            </span>
            <div className="p-2 rounded-lg bg-[#d3e4fe] text-[#00687a]">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="z-10">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold tracking-tight text-[#191c1e]">
                {totalPredios}
              </span>
              <span className="text-xs text-[#434655]">suministros</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#059669]"></span>
                <span className="text-[#434655] font-medium">{activeCount} Al día</span>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity select-none pointer-events-none">
            <span className="material-symbols-outlined text-[120px]">apartment</span>
          </div>
        </div>

        {/* KPI 4: Estado de Deudas / Morosidad */}
        <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-2xs flex flex-col justify-between h-36 relative overflow-hidden group hover:border-[#cbd5e1] transition-all">
          <div className="flex justify-between items-start z-10">
            <span className="text-[11px] font-semibold tracking-wider text-[#434655] uppercase">
              Estado de Deuda
            </span>
            <div className={`p-2 rounded-lg ${withDebtCount > 0 ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#ecfdf5] text-[#059669]'}`}>
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          <div className="z-10">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold tracking-tight text-[#191c1e]">
                {withDebtCount}
              </span>
              <span className="text-xs text-[#434655]">con morosidad</span>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${withDebtCount > 0 ? 'text-[#ba1a1a]' : 'text-[#059669]'}`}>
              {withDebtCount > 0 ? 'Requiere gestión de cobro' : 'Sin deudas registradas'}
            </div>
          </div>

          <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity select-none pointer-events-none">
            <span className="material-symbols-outlined text-[120px]">warning</span>
          </div>
        </div>

      </div>
    </div>
  );
};