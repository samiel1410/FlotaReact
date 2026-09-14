import { useState, useEffect } from 'react';
import { api } from '../../../../config/axios';
import toast from 'react-hot-toast';

export const NuevoCobroModal = ({ buses, onClose, onSuccess }) => {
  const [tipos, setTipos] = useState([]);
  const [tipoCobro, setTipoCobro] = useState('');
  const [busId, setBusId] = useState('');
  const [valor, setValor] = useState('0.00');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get('/tipo_cobros/tipoCobros').then(res => {
      setTipos(res.data?.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleTipoChange = (id) => {
    setTipoCobro(id);
    const selected = tipos.find(t => String(t.id_tipo_cobros) === String(id));
    if (selected && selected.valor_tipo_cobros) {
      setValor(parseFloat(selected.valor_tipo_cobros).toFixed(2));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tipoCobro || !busId || !valor || Number(valor) <= 0) {
      toast.error('Complete los campos requeridos');
      return;
    }
    setGuardando(true);
    try {
      const res = await api.post('/cobro/agregarCobro', {
        tipo_cobro: tipoCobro,
        id_bus: busId,
        valor_retencion: valor,
        observaciones
      });
      if (res.data?.success) {
        toast.success('Cobro creado correctamente');
        onSuccess();
        onClose();
      } else {
        toast.error(res.data?.error || 'Error al guardar cobro');
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
              <i className="fas fa-plus-circle text-sm" />
            </span>
            <h3 className="text-white font-bold text-sm">Nuevo Cobro</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <i className="fas fa-times" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Cobro *</label>
            <select
              value={tipoCobro}
              onChange={e => handleTipoChange(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            >
              <option value="">Seleccione tipo...</option>
              {tipos.map(t => (
                <option key={t.id_tipo_cobros} value={t.id_tipo_cobros}>
                  {t.nombre_tipo_cobros} (${parseFloat(t.valor_tipo_cobros || 0).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Bus *</label>
            <select
              value={busId}
              onChange={e => setBusId(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            >
              <option value="">Seleccione bus...</option>
              {buses.map(b => (
                <option key={b.id_buses} value={b.id_buses}>
                  Disco: {b.disco_buses} - {b.placa_buses || ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Valor ($) *</label>
            <input
              type="number"
              step="0.01"
              value={valor}
              onChange={e => setValor(e.target.value)}
              className="w-full text-sm font-bold text-slate-800 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
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
              {guardando ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-save" />}
              <span>{guardando ? 'Guardando...' : 'Guardar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
