import { useState, useEffect } from 'react';
import { api } from '../../../../config/axios';
import toast from 'react-hot-toast';

export const RetencionesMasivasModal = ({ onClose, onSuccess }) => {
  const [tipos, setTipos] = useState([]);
  const [tipoCobro, setTipoCobro] = useState('');
  const [valor, setValor] = useState('0.00');
  const [fechaCobro, setFechaCobro] = useState(new Date().toISOString().split('T')[0]);
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
    if (!tipoCobro || !valor || Number(valor) <= 0 || !fechaCobro) {
      toast.error('Complete todos los campos requeridos');
      return;
    }
    setGuardando(true);
    try {
      const busesRes = await api.get('/buses/seleccionarBuses', { params: { limit: 500 } });
      const todosBuses = busesRes.data?.data || [];
      const idsBuses = todosBuses.map(b => b.id_buses);
      if (idsBuses.length === 0) {
        toast.error('No se encontraron buses registrados');
        setGuardando(false);
        return;
      }
      const res = await api.post('/cobro/agregarCobroMasivo', {
        tipo_cobro: tipoCobro,
        valor_retencion: valor,
        fecha_cobro: fechaCobro,
        observaciones,
        id_bus: idsBuses
      });
      if (res.data?.success) {
        toast.success(res.data.data?.mensaje || 'Retenciones masivas creadas correctamente');
        onSuccess();
        onClose();
      } else {
        toast.error(res.data?.error || 'Error al crear retenciones');
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
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <i className="fas fa-file-invoice-dollar text-sm" />
            </span>
            <h3 className="text-white font-bold text-sm">Crear Retenciones Masivas</h3>
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
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Valor ($) *</label>
            <input
              type="number"
              step="0.01"
              value={valor}
              onChange={e => setValor(e.target.value)}
              className="w-full text-sm font-bold text-slate-800 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Fecha Cobro *</label>
            <input
              type="date"
              value={fechaCobro}
              onChange={e => setFechaCobro(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              rows={2}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-xs text-amber-800 flex items-center gap-2">
            <i className="fas fa-info-circle text-amber-600 shrink-0" />
            <span>Esta acción generará este cobro para todos los buses registrados activos.</span>
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
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
            >
              {guardando ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check-double" />}
              <span>{guardando ? 'Generando...' : 'Crear Retenciones'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
