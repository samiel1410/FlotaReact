import { useState, useEffect } from 'react';
import { api } from '../../../../config/axios';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/cobrosHelpers';

export const EntregarCobroModal = ({ cobro, onClose, onSuccess }) => {
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!cobro) return null;

  const handleEntregar = async () => {
    setGuardando(true);
    try {
      const res = await api.post('/cobro/entregarCobro', { id_cobros: cobro.id_cobros });
      if (res.data?.success) {
        toast.success('Cobro entregado correctamente');
        onSuccess();
        onClose();
      } else {
        toast.error(res.data?.message || 'Error al entregar cobro');
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
      <div className="relative z-10 w-full max-w-sm bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden text-center p-6 space-y-4">
        <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl">
          <i className="fas fa-hand-holding-dollar" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">¿Entregar Cobro?</h3>
          <p className="text-xs text-slate-500 mt-1">
            Confirme la entrega del cobro <b>#{cobro.id_cobros}</b> (Bus {cobro.disco_buses || '-'}).
          </p>
          <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700">
            <div><b>Monto:</b> {formatCurrency(cobro.monto_cobros)}</div>
            <div><b>Tipo:</b> {cobro.nombre_tipo_cobros}</div>
          </div>
        </div>
        <div className="flex gap-2 justify-center pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleEntregar}
            disabled={guardando}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
          >
            {guardando ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
            <span>{guardando ? 'Entregando...' : 'Sí, Entregar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
