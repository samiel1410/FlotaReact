import { useState } from 'react';
import { ListadoCobrosTab } from './components/tabs/ListadoCobrosTab';
import { CobroRapidoTab } from './components/tabs/CobroRapidoTab';
import { ComprobantesPagoTab } from './components/tabs/ComprobantesPagoTab';

// ============================================================
// PÁGINA PRINCIPAL: GESTIÓN DE COBROS (MODULARIZADA)
// ============================================================
export const CobrosPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { id: 'listado', label: 'Listado de Cobros', icon: 'fas fa-list', component: ListadoCobrosTab },
    { id: 'rapido', label: 'Cobro Rápido', icon: 'fas fa-money-bill-wave', component: CobroRapidoTab },
    { id: 'comprobantes', label: 'Comprobantes de Pago', icon: 'fas fa-file-invoice-dollar', component: ComprobantesPagoTab },
  ];

  const ActiveComponent = tabs[activeTab].component;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
        <i className="fas fa-dollar-sign text-emerald-600"></i>
        Listado de Cobros
      </h1>

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
          </button>
        ))}
      </div>

      {/* Contenido del Tab Activo */}
      <div className="min-h-[400px]">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default CobrosPage;
