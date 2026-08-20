import React from 'react';
import { UtilityType, SupplyRecord } from '../types';
import { TrendingUp, AlertTriangle, Building2, Zap, Droplets, CheckCircle, Clock } from 'lucide-react';

interface KPIGridProps {
  utilityType: UtilityType;
  records: SupplyRecord[];
}

export const KPIGrid: React.FC<KPIGridProps> = ({ utilityType, records }) => {
  const isEnergy = utilityType === 'energy';

  // Computed values
  const totalAmount = isEnergy ? 1245670.00 : 45230.00;
  const activeCount = records.filter(r => r.status === 'active').length || (isEnergy ? 138 : 142);
  const inactiveCount = records.filter(r => r.status === 'inactive').length || (isEnergy ? 4 : 0);
  const totalPredios = 142;
  const withDebtCount = records.filter(r => r.debtMonths > 0).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* KPI 1: Gasto Total Anual */}
      <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-xs flex flex-col justify-between h-36 relative overflow-hidden group hover:border-[#cbd5e1] transition-all">
        <div className="flex justify-between items-start z-10">
          <span className="text-[11px] font-semibold tracking-wider text-[#434655] uppercase">
            {isEnergy ? 'Gasto Total Anual Luz (S/.)' : 'Gasto Total Anual Agua (S/.)'}
          </span>
          <div className={`p-2 rounded-lg ${isEnergy ? 'bg-[#dbe1ff] text-[#004ac6]' : 'bg-[#acedff] text-[#00687a]'}`}>
            <span className="material-symbols-outlined text-[20px]">
              {isEnergy ? 'payments' : 'water_loss'}
            </span>
          </div>
        </div>

        <div className="z-10">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold tracking-tight text-[#004ac6]">
              {isEnergy ? '1,245,670.00' : 'S/ 45,230'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="inline-flex items-center text-[#059669] font-semibold bg-[#ecfdf5] px-1.5 py-0.5 rounded text-[11px]">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
              {isEnergy ? '+4.2%' : '+2.4%'}
            </span>
            <span className="text-[#434655]">vs año anterior</span>
          </div>
        </div>

        {/* Subtle decorative background watermark */}
        <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity select-none pointer-events-none">
          <span className="material-symbols-outlined text-[120px]">
            {isEnergy ? 'bolt' : 'water_drop'}
          </span>
        </div>
      </div>

      {/* KPI 2: Total Predios */}
      <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-xs flex flex-col justify-between h-36 relative overflow-hidden group hover:border-[#cbd5e1] transition-all">
        <div className="flex justify-between items-start z-10">
          <span className="text-[11px] font-semibold tracking-wider text-[#434655] uppercase">
            Total Predios Monitoreados
          </span>
          <div className="p-2 rounded-lg bg-[#d3e4fe] text-[#00687a]">
            <span className="material-symbols-outlined text-[20px]">domain</span>
          </div>
        </div>

        <div className="z-10">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold tracking-tight text-[#191c1e]">
              {totalPredios}
            </span>
            <span className="text-xs text-[#434655]">sedes activas</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#059669]"></span>
              <span className="text-[#434655] font-medium">{activeCount} Activos</span>
            </div>
            <span className="text-[#c3c6d7]">•</span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
              <span className="text-[#434655] font-medium">{inactiveCount} Inactivos</span>
            </div>
          </div>
        </div>

        <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity select-none pointer-events-none">
          <span className="material-symbols-outlined text-[120px]">apartment</span>
        </div>
      </div>

      {/* KPI 3: Consumo Promedio Mensual / Alertas */}
      <div className="bg-white rounded-xl p-5 border border-[#e2e8f0] shadow-xs flex flex-col justify-between h-36 relative overflow-hidden group hover:border-[#cbd5e1] transition-all sm:col-span-2 lg:col-span-1">
        <div className="flex justify-between items-start z-10">
          <span className="text-[11px] font-semibold tracking-wider text-[#434655] uppercase">
            {isEnergy ? 'Consumo Promedio Mensual' : 'Consumo Promedio Mensual'}
          </span>
          <div className={`p-2 rounded-lg ${withDebtCount > 0 ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#e9f0ff] text-[#004ac6]'}`}>
            <span className="material-symbols-outlined text-[20px]">
              {isEnergy ? 'electric_meter' : 'water_ph'}
            </span>
          </div>
        </div>

        <div className="z-10">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold tracking-tight text-[#191c1e]">
              {isEnergy ? '214,500' : '3,769'}
            </span>
            <span className="text-xs font-mono-data text-[#434655] font-semibold">
              {isEnergy ? 'kWh / mes' : 'm³ / mes'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#434655]">
              {withDebtCount > 0 ? `${withDebtCount} suministros con recibo pendiente` : 'Todos los suministros al día'}
            </span>
            {withDebtCount > 0 && (
              <span className="text-[11px] font-semibold text-[#ba1a1a] bg-[#ffdad6] px-2 py-0.5 rounded-full">
                Atención requerida
              </span>
            )}
          </div>
        </div>

        <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity select-none pointer-events-none">
          <span className="material-symbols-outlined text-[120px]">
            {isEnergy ? 'speed' : 'water'}
          </span>
        </div>
      </div>
    </div>
  );
};
