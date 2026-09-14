import { useEffect } from 'react';
import { formatCurrency } from '../../utils/cobrosHelpers';

export const ProcesarCobroRapidoModal = ({ info, onConfirm, onClose, guardando }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!info || !info.data?.length) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-slate-800 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <i className="fas fa-hand-holding-usd text-sm" />
            </span>
            <h3 className="text-white font-bold text-sm">Confirmar Cobro Rápido</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Cliente / Chofer:</span>
              <b>{info.data[0]?.per_nombres_persona || ''} {info.data[0]?.per_apellidos_personal || ''}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bus:</span>
              <b>{info.data[0]?.disco_buses || '-'}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cantidad de Cobros:</span>
              <b>{info.data.length} cobro(s)</b>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 text-emerald-700">
              <span className="font-bold">Total a Cobrar:</span>
              <b className="text-sm">{formatCurrency(info.info_clave?.total_pendiente || 0)}</b>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={guardando}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
            >
              {guardando ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
              <span>{guardando ? 'Procesando...' : 'Sí, Procesar Cobro'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
