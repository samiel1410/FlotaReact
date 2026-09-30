import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../../../components/common/Modal';
import { cobrosService } from '../../../services/cobros.service';
import { formatCurrency } from '../utils/multasConstants';

export const PagarMultaModal = ({ multa, onClose, onSuccess }) => {
  const [monto, setMonto] = useState(String(multa.saldo_pendiente || multa.valor_original || ''));
  const [observacion, setObservacion] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePagar = async (e) => {
    e?.preventDefault();
    const val = parseFloat(monto);
    if (!val || val <= 0) {
      toast.error('Ingrese un monto válido a pagar');
      return;
    }
    if (val > parseFloat(multa.saldo_pendiente || multa.valor_original)) {
      toast.error('El monto no puede superar el saldo pendiente');
      return;
    }

    setLoading(true);
    try {
      const res = await cobrosService.pagarDeuda({
        id_deuda: multa.id_deuda,
        monto: val,
        observacion: observacion.trim() || 'Cobro manual en ventanilla'
      });

      if (res.success) {
        toast.success(res.message || 'Pago registrado correctamente');
        onSuccess();
      } else {
        toast.error(res.message || 'Error al registrar pago');
      }
    } catch (err) {
      toast.error(err.message || 'Error al procesar pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Registrar Cobro en Ventanilla — Multa #${multa.id_deuda}`} width="max-w-md">
      <form onSubmit={handlePagar} className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Socio / Unidad:</span>
            <span className="font-bold text-slate-800">{multa.socio_nombre} (Bus {multa.disco_buses || '-'})</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Saldo Pendiente:</span>
            <span className="font-mono font-black text-rose-600 text-sm">{formatCurrency(multa.saldo_pendiente)}</span>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Monto a Cobrar ($) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={multa.saldo_pendiente}
              required
              className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              value={monto}
              onChange={e => setMonto(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Observación del Cobro</label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 resize-none"
            value={observacion}
            onChange={e => setObservacion(e.target.value)}
            placeholder="Recibo manual en ventanilla, comprobante #..."
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
            disabled={loading}
            className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            {loading ? (
              <><i className="fas fa-spinner fa-spin"></i> Procesando...</>
            ) : (
              <><i className="fas fa-dollar-sign"></i> Confirmar Cobro</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PagarMultaModal;
