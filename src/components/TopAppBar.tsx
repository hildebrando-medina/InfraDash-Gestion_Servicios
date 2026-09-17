import React, { useState } from 'react';
import { UtilityType, UserRole } from '../types';
import { Shield, Eye, LogOut, CheckCircle2 } from 'lucide-react';

interface TopAppBarProps {
  activeTab: UtilityType;
  setActiveTab: (tab: UtilityType) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  userEmail?: string;
  onShowToast: (title: string, message: string, type: 'info' | 'success') => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  activeTab,
  setActiveTab,
  role,
  setRole,
  userEmail = 'p4oleoductom@gmail.com',
  onShowToast
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    onShowToast(
      'Modo de Acceso Actualizado',
      newRole === 'admin' 
        ? 'Modo Administrador activado: Permisos de edición, creación y eliminación habilitados.'
        : 'Modo Consulta activado: Vista de solo lectura para auditoría y visualización.',
      'info'
    );
  };

  return (
    <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-40 w-full px-4 sm:px-6 h-16 flex items-center justify-between shadow-xs">
      {/* Left: Brand Logo & Desktop Navigation */}
      <div className="flex items-center gap-6 md:gap-8">
        <div 
          className="flex items-center gap-2.5 cursor-pointer select-none group"
          onClick={() => setActiveTab('energy')}
          title="InfraDash Home"
        >
          <div className="w-9 h-9 rounded-lg bg-[#004ac6] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
            <span className="material-symbols-outlined text-[22px]">speed</span>
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-[#004ac6]">InfraDash</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 bg-[#dbe1ff] text-[#00174b] rounded-full">
              v2.4
            </span>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setActiveTab('energy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'energy'
                ? 'text-[#004ac6] bg-[#004ac6]/10 font-semibold shadow-2xs'
                : 'text-[#434655] hover:text-[#191c1e] hover:bg-[#eceef0]'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${activeTab === 'energy' ? 'fill' : ''}`}>
              bolt
            </span>
            <span>Energía (Luz)</span>
          </button>

          <button
            onClick={() => setActiveTab('water')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'water'
                ? 'text-[#00687a] bg-[#57dffe]/20 font-semibold shadow-2xs'
                : 'text-[#434655] hover:text-[#191c1e] hover:bg-[#eceef0]'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${activeTab === 'water' ? 'fill' : ''}`}>
              water_drop
            </span>
            <span>Agua Potable</span>
          </button>
        </nav>
      </div>

      {/* Right: Role Switcher & User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Role Switcher */}
        <div className="flex items-center bg-[#f2f4f6] p-1 rounded-full border border-[#e2e8f0] shadow-inner">
          <button
            id="btn-admin"
            onClick={() => handleRoleChange('admin')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 ${
              role === 'admin'
                ? 'bg-white text-[#004ac6] shadow-sm ring-1 ring-black/5 font-bold'
                : 'text-[#434655] hover:text-[#191c1e] bg-transparent'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>

          <button
            id="btn-consult"
            onClick={() => handleRoleChange('consult')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 ${
              role === 'consult'
                ? 'bg-white text-[#004ac6] shadow-sm ring-1 ring-black/5 font-bold'
                : 'text-[#434655] hover:text-[#191c1e] bg-transparent'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Consult</span>
          </button>
        </div>

        {/* User Profile Avatar with dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-[#004ac6]/30 transition-all focus:outline-none"
            title="Perfil de Usuario"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              alt="Administrador Infraestructura"
              className="w-8 h-8 rounded-full object-cover border border-[#c3c6d7]"
            />
          </button>

          {showProfileMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-[#e2e8f0] p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center gap-3 pb-3 border-b border-[#e2e8f0]">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                    alt="Administrador"
                    className="w-10 h-10 rounded-full object-cover border border-[#c3c6d7]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#191c1e] truncate">Ing. Roberto Morales</p>
                    <p className="text-xs text-[#434655] truncate">{userEmail}</p>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-[#059669] font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Sesión activa</span>
                    </div>
                  </div>
                </div>

                <div className="py-2 text-xs text-[#434655] space-y-1">
                  <div className="flex justify-between py-1 px-2 rounded hover:bg-[#f2f4f6]">
                    <span>Rol actual:</span>
                    <span className="font-semibold text-[#004ac6] uppercase">{role}</span>
                  </div>
                  <div className="flex justify-between py-1 px-2 rounded hover:bg-[#f2f4f6]">
                    <span>Total predios:</span>
                    <span className="font-semibold text-[#191c1e]">142 sedes</span>
                  </div>
                  <div className="flex justify-between py-1 px-2 rounded hover:bg-[#f2f4f6]">
                    <span>Servidor central:</span>
                    <span className="font-semibold text-[#059669]">En línea (99.9%)</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#e2e8f0]">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onShowToast('Información', 'Para cambiar de cuenta comuníquese con IT.', 'info');
                    }}
                    className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded font-medium transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar sesión corporativa</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};