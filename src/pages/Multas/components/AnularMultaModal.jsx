import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../../../components/common/Modal';
import { cobrosService } from '../../../services/cobros.service';
import { formatCurrency } from '../utils/multasConstants';

export const AnularMultaModal = ({ multa, onClose, onSuccess }) => {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAnular = async (e) => {
    e?.preventDefault();
    if (!motivo.trim()) {
      toast.error('Debe ingresar el motivo de la anulación');
      return;
    }
    setLoading(true);
    try {
      const res = await cobrosService.anularDeuda({
        id_deuda: multa.id_deuda,
        fuente: 'deuda',
        motivo: motivo.trim()
      });

      if (res.success) {
        toast.success(res.message || 'Multa anulada correctamente');
        onSuccess();
      } else {
        toast.error(res.message || 'No se pudo anular la multa');
      }
    } catch (err) {
      toast.error(err.message || 'Error al anular');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Anular Multa" width="max-w-md">
      <form onSubmit={handleAnular} className="space-y-4">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-rose-800">
            <i className="fas fa-exclamation-triangle text-rose-600 text-sm"></i>
            <span>Confirmación de Anulación</span>
          </div>
          <p className="text-slate-700">
            Se anulará la multa <strong className="font-mono text-slate-900">#{multa?.id_deuda}</strong> por valor de{' '}
            <strong className="font-mono text-rose-700">{formatCurrency(multa?.valor_original)}</strong> asignada a{' '}
            <strong>{multa?.socio_nombre}</strong> (Bus {multa?.disco_buses || '-'}).
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Motivo de anulación <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            placeholder="Describa el motivo de anulación (justificación requerida)..."
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-slate-400 resize-none"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !motivo.trim()}
            className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            {loading ? (
              <><i className="fas fa-spinner fa-spin"></i> Anulando...</>
            ) : (
              <><i className="fas fa-ban"></i> Confirmar Anulación</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AnularMultaModal;
