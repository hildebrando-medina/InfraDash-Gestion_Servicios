import React from 'react';
import { SupplyRecord } from '../types';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  record: SupplyRecord | null;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  record
}) => {
  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 text-[#ba1a1a] mb-4">
            <div className="w-10 h-10 rounded-full bg-[#ffdad6] flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#191c1e]">Confirmar Eliminación</h3>
              <p className="text-xs text-[#737686]">Esta acción no se puede deshacer</p>
            </div>
          </div>

          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 text-xs space-y-1 mb-5">
            <p className="font-semibold text-[#191c1e]">{record.propertyName}</p>
            <p className="text-[#434655] font-mono-data">Suministro: {record.supplyNumber}</p>
            <p className="text-[#737686] truncate">{record.address}</p>
          </div>

          <p className="text-xs text-[#434655] leading-relaxed">
            ¿Está seguro de que desea eliminar permanentemente este registro de suministro del sistema? Se perderá el historial de consumo y recibos asociados.
          </p>
        </div>

        <div className="px-6 py-3.5 border-t border-[#e2e8f0] bg-[#f8fafc] flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#cbd5e1] rounded-lg text-xs font-semibold text-[#434655] hover:bg-[#f1f5f9] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-[#ba1a1a] text-white rounded-lg text-xs font-semibold hover:bg-red-700 shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar Definitivamente</span>
          </button>
        </div>
      </div>
    </div>
  );
};
