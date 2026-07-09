import React from 'react';
import { CajaNotaVentaContent } from './components/CajaNotaVentaContent';

export const CajaNotaVentaPage = () => {
  return (
    <div className="flex flex-col min-h-screen gap-2 p-0 bg-slate-100/50">
      <div className="bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50/50">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-sm border border-white">
            <i className="fas fa-cash-register text-sm"></i>
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">Cajas Notas de Venta</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestión de Caja de Encomiendas</p>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col min-h-0 p-2">
        <CajaNotaVentaContent />
      </div>
    </div>
  );
};
