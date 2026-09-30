import React from 'react';
import { formatCurrency } from '../utils/multasConstants';

export const MultasResumenCards = ({ resumen }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Registrado</span>
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs">
            <i className="fas fa-list-ol"></i>
          </div>
        </div>
        <p className="text-xl font-black text-slate-800 font-mono mt-1">{formatCurrency(resumen.totalOriginal)}</p>
        <span className="text-[11px] text-slate-400 font-medium">{resumen.count} multa(s) en total</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Recaudado / Pagado</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
            <i className="fas fa-check-circle"></i>
          </div>
        </div>
        <p className="text-xl font-black text-emerald-600 font-mono mt-1">{formatCurrency(resumen.totalPagado)}</p>
        <span className="text-[11px] text-slate-400 font-medium">Descontado en despacho y ventanilla</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Saldo Pendiente</span>
          <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-xs">
            <i className="fas fa-exclamation-circle"></i>
          </div>
        </div>
        <p className="text-xl font-black text-rose-600 font-mono mt-1">{formatCurrency(resumen.totalPendiente)}</p>
        <span className="text-[11px] text-slate-400 font-medium">Por descontar en próximos viajes</span>
      </div>

      <div className="bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest">Regla de Prioridad</span>
          <div className="w-7 h-7 rounded-lg bg-rose-200 text-rose-800 flex items-center justify-center text-xs">
            <i className="fas fa-bolt"></i>
          </div>
        </div>
        <p className="text-sm font-black text-rose-900 mt-1">100% de Recaudación</p>
        <span className="text-[11px] text-rose-700 font-medium">Deducción de 1° Orden automática</span>
      </div>
    </div>
  );
};

export default MultasResumenCards;
