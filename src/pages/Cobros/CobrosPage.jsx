import { useEffect, useState } from 'react';
import { ListadoCobrosTab } from './components/tabs/ListadoCobrosTab';
import { CobroRapidoTab } from './components/tabs/CobroRapidoTab';
import { ComprobantesPagoTab } from './components/tabs/ComprobantesPagoTab';
import { PromesasPorCobrarPanel } from '../PromesasPago/components/PromesasPorCobrarPanel';
import { AvisoCajaCobros } from '../../components/common/AvisoCajaCobros';
import { useCajaCobros } from '../../hooks/useCajaCobros';
import { promesaPagoService } from '../../services/promesaPago.service';

// ============================================================
// PÁGINA PRINCIPAL: GESTIÓN DE COBROS (MODULARIZADA)
// ============================================================
export const CobrosPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { caja, loading, recargar } = useCajaCobros();
  const [resumenPromesas, setResumenPromesas] = useState({ vencidas: 0, hoy: 0, proximas: 0, cantidad: 0 });

  useEffect(() => {
    let activo = true;
    promesaPagoService.porCobrar()
      .then((res) => {
        if (activo && res.success) setResumenPromesas(res.resumen || {});
      })
      .catch(() => {});
    return () => { activo = false; };
  }, []);

  const pendientesPromesas = (resumenPromesas.vencidas || 0) + (resumenPromesas.hoy || 0);

  const tabs = [
    { id: 'listado', label: 'Listado de Cobros', icon: 'fas fa-list', component: ListadoCobrosTab },
    { id: 'rapido', label: 'Cobro Rápido', icon: 'fas fa-money-bill-wave', component: CobroRapidoTab },
    { id: 'comprobantes', label: 'Comprobantes de Pago', icon: 'fas fa-file-invoice-dollar', component: ComprobantesPagoTab },
    { id: 'promesas', label: 'Promesas por Cobrar', icon: 'fas fa-calendar-check', component: PromesasPorCobrarPanel, badge: pendientesPromesas },
  ];

  const ActiveComponent = tabs[activeTab].component;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
        <i className="fas fa-dollar-sign text-emerald-600"></i>
        Listado de Cobros
      </h1>

      {/* Estado de la caja del usuario que cobra */}
      <AvisoCajaCobros caja={caja} loading={loading} recargar={recargar} />

      {pendientesPromesas > 0 && activeTab !== 3 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-amber-800">
            <i className="fas fa-bell text-amber-600" />
            <span>
              Hay <b>{pendientesPromesas}</b> promesa(s) de pago vencida(s) o para cobrar hoy en la caja.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab(3)}
            className="h-8 px-3 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg"
          >
            Ver bandeja <i className="fas fa-arrow-right ml-1 text-[10px]" />
          </button>
        </div>
      )}

      {/* Navegación por Pestañas */}
      <div className="flex border-b border-slate-200 gap-0">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(i)}
            className={`px-5 py-3 text-sm font-bold transition-all relative ${
              activeTab === i
                ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <i className={`${tab.icon} mr-2`}></i>
            {tab.label}
            {tab.badge > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido del Tab Activo */}
      <div className="min-h-[400px]">
        <ActiveComponent caja={caja} recargarCaja={recargar} onResumenChange={setResumenPromesas} />
      </div>
    </div>
  );
};

export default CobrosPage;

