import { useState, useEffect } from 'react';
import { api } from '../../../../config/axios';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/cobrosHelpers';

export const CobrarMasivoModal = ({ seleccionados, onClose, onSuccess }) => {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [concepto, setConcepto] = useState('Cobro Masivo');
  const [observacion, setObservacion] = useState('');
  const [formaPago, setFormaPago] = useState('1');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const total = (seleccionados || []).reduce((s, r) => s + parseFloat(r.saldo_pendiente || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await api.post('/cobro/pagarRetencionMasivo', {
        items: JSON.stringify(seleccionados.map(r => ({ id: r.id_cobros, a_pagar: r.saldo_pendiente }))),
        total,
        idformapago: formaPago,
        fecha,
        concepto,
        observacion
      });
      if (res.data?.success) {
        toast.success(`Se procesaron ${res.data.comprobantes?.length || seleccionados.length} cobros correctamente`);
        onSuccess();
        onClose();
      } else {
        toast.error(res.data?.error || 'Error al procesar cobro masivo');
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
      <div className="relative z-10 w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="bg-slate-800 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <i className="fas fa-layer-group text-sm" />
            </span>
            <div>
              <h3 className="text-white font-bold text-sm">Cobro Masivo</h3>
              <p className="text-xs text-slate-400">{seleccionados.length} cobro(s) seleccionados</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <i className="fas fa-times" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b text-slate-600 font-bold">
                <tr>
                  <th className="px-3 py-1.5 text-left">ID</th>
                  <th className="px-3 py-1.5 text-left">Tipo</th>
                  <th className="px-3 py-1.5 text-left">Bus</th>
                  <th className="px-3 py-1.5 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {seleccionados.map(r => (
                  <tr key={r.id_cobros}>
                    <td className="px-3 py-1.5 text-slate-500">#{r.id_cobros}</td>
                    <td className="px-3 py-1.5">{r.nombre_tipo_cobros}</td>
                    <td className="px-3 py-1.5 font-bold">{r.disco_buses}</td>
                    <td className="px-3 py-1.5 text-right font-bold text-emerald-600">{formatCurrency(r.saldo_pendiente)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex justify-between items-center text-xs">
            <span className="font-bold text-emerald-800">TOTAL A COBRAR:</span>
            <strong className="text-base text-emerald-700 font-bold">{formatCurrency(total)}</strong>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Concepto</label>
              <input
                type="text"
                value={concepto}
                onChange={e => setConcepto(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Observación</label>
            <textarea
              value={observacion}
              onChange={e => setObservacion(e.target.value)}
              rows={2}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
            >
              {guardando ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
              <span>{guardando ? 'Procesando...' : 'Cobrar Seleccionados'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
