import { useState, useEffect } from 'react';
import { api } from '../../../../config/axios';
import toast from 'react-hot-toast';

export const AnularComprobanteModal = ({ comprobanteId, onClose, onSuccess }) => {
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!comprobanteId) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!motivo.trim()) {
      toast.error('Ingrese el motivo de anulación');
      return;
    }
    setGuardando(true);
    try {
      const res = await api.post('/cobro/anularComprobanteCobro', {
        id_comprobante_cobro: comprobanteId,
        motivoAnulacion: motivo.trim()
      });
      if (res.data?.success) {
        toast.success('Comprobante anulado correctamente');
        onSuccess();
        onClose();
      } else {
        toast.error(res.data?.message || 'Error al anular comprobante');
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
        <div className="bg-red-800 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center">
              <i className="fas fa-ban text-sm" />
            </span>
            <h3 className="text-white font-bold text-sm">Anular Comprobante #{comprobanteId}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-red-200 hover:text-white rounded-lg transition-colors">
            <i className="fas fa-times" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Motivo de Anulación *</label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Explique la razón de la anulación..."
              rows={3}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-red-500 focus:outline-none"
              required
            />
          </div>

          <div className="bg-red-50 border border-red-200 p-2.5 rounded-lg text-xs text-red-800 flex items-center gap-2">
            <i className="fas fa-exclamation-triangle text-red-600 shrink-0" />
            <span>Esta acción revertirá los cobros asociados y no se puede deshacer.</span>
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
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
            >
              {guardando ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-trash-alt" />}
              <span>{guardando ? 'Anulando...' : 'Anular Comprobante'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
