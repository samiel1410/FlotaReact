import { useState, useEffect } from 'react';
import { api } from '../../../../config/axios';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/cobrosHelpers';

export const CobrarModal = ({ cobro, onClose, onSuccess }) => {
  const [monto, setMonto] = useState(cobro?.saldo_pendiente || cobro?.monto_cobros || 0);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [concepto, setConcepto] = useState(`Pago ${cobro?.nombre_tipo_cobros || 'Cobro'}`);
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!cobro) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!monto || Number(monto) <= 0) {
      toast.error('Ingrese un monto válido a cobrar');
      return;
    }
    setGuardando(true);
    try {
      const res = await api.post('/cobro/pagarRetencion', {
        id_cobro: cobro.id_cobros,
        id_bus: cobro.id_fkbus_cobros,
        monto: Number(monto),
        fecha,
        concepto,
        observacion,
        idformapago: 1
      });
      if (res.data?.success) {
        toast.success('Cobro registrado correctamente');
        onSuccess();
        onClose();
      } else {
        toast.error(res.data?.error || 'Error al procesar el cobro');
      }
    } catch (err) {
      toast.error(err.message || 'Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-slate-800 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <i className="fas fa-hand-holding-usd text-sm" />
            </span>
            <div>
              <h3 className="text-white font-bold text-sm">Registrar Cobro</h3>
              <p className="text-xs text-slate-400">{cobro.nombre_tipo_cobros} &bull; Bus {cobro.disco_buses}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <i className="fas fa-times" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
            <div><span className="text-slate-500 block">Total</span><strong className="text-slate-800">{formatCurrency(cobro.monto_cobros)}</strong></div>
            <div><span className="text-slate-500 block">Pagado</span><strong className="text-emerald-600">{formatCurrency(cobro.total_pagado)}</strong></div>
            <div><span className="text-slate-500 block">Saldo</span><strong className="text-amber-600">{formatCurrency(cobro.saldo_pendiente)}</strong></div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Monto a Cobrar ($) *</label>
            <input
              type="number"
              step="0.01"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Pago *</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Concepto</label>
            <input
              type="text"
              value={concepto}
              onChange={e => setConcepto(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Observación</label>
            <textarea
              value={observacion}
              onChange={e => setObservacion(e.target.value)}
              rows={2}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
            >
              {guardando ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
              <span>{guardando ? 'Guardando...' : 'Guardar Cobro'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
