import React from 'react';
import { UtilityType } from '../types';

interface BottomNavBarProps {
  activeTab: UtilityType;
  setActiveTab: (tab: UtilityType) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#e2e8f0] flex items-center justify-around px-4 md:hidden z-40 shadow-lg">
      {/* Energía Button */}
      <button
        onClick={() => setActiveTab('energy')}
        className={`flex flex-col items-center justify-center py-1.5 px-6 rounded-full transition-all duration-200 ${
          activeTab === 'energy'
            ? 'bg-[#57dffe] text-[#006172] font-bold scale-100 shadow-xs'
            : 'text-[#434655] hover:text-[#191c1e] scale-95'
        }`}
      >
        <span className={`material-symbols-outlined text-[22px] ${activeTab === 'energy' ? 'fill' : ''}`}>
          bolt
        </span>
        <span className="text-[11px] font-semibold tracking-wider uppercase mt-0.5">
          Energía
        </span>
      </button>

      {/* Agua Button */}
      <button
        onClick={() => setActiveTab('water')}
        className={`flex flex-col items-center justify-center py-1.5 px-6 rounded-full transition-all duration-200 ${
          activeTab === 'water'
            ? 'bg-[#57dffe] text-[#006172] font-bold scale-100 shadow-xs'
            : 'text-[#434655] hover:text-[#191c1e] scale-95'
        }`}
      >
        <span className={`material-symbols-outlined text-[22px] ${activeTab === 'water' ? 'fill' : ''}`}>
          water_drop
        </span>
        <span className="text-[11px] font-semibold tracking-wider uppercase mt-0.5">
          Agua
        </span>
      </button>
    </nav>
  );
};
