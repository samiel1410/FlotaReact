import React, { useState } from 'react';
import toast from 'react-hot-toast';
import ViajesService from '../../services/viajes.service';

const ModalReversarDespacho = ({ trip, onClose, onReversado }) => {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!motivo.trim()) {
      toast.error('Debe ingresar el motivo de la reversión');
      return;
    }

    setLoading(true);
    try {
      const response = await ViajesService.reversarDespacho({
        id_viaje: trip.id_viajes,
        motivo: motivo.trim()
      });

      if (response.success) {
        toast.success(response.message || 'Despacho reversado correctamente');
        if (onReversado) onReversado(response);
        onClose();
      } else {
        toast.error(response.message || 'Error al reversar el despacho');
      }
    } catch (error) {
      toast.error('Error de red al intentar reversar el despacho');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      >
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
              <i className="fas fa-undo-alt text-base"></i>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-slate-800">Reversar Despacho</h2>
              <p className="text-[11px] font-bold text-rose-600 truncate" title={`Viaje #${trip?.id_viajes} — ${trip?.nombre_ruta || 'Ruta'}`}>
                Viaje #{trip?.id_viajes} — {trip?.nombre_ruta || 'Ruta'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="h-8 w-8 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {/* Info Banner */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
            <div className="min-w-0">
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">N° VIAJE</span>
              <span className="block font-bold text-slate-800 truncate">#{trip?.id_viajes}</span>
            </div>
            <div className="min-w-0">
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">BUS / UNIDAD</span>
              <span className="block font-bold text-slate-800 truncate" title={trip?.nombre_bus || `Bus #${trip?.id_fkbus_viajes || '-'}`}>
                {trip?.nombre_bus || `Bus #${trip?.id_fkbus_viajes || '-'}`}
              </span>
            </div>
            <div className="min-w-0">
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">CONDUCTOR</span>
              <span className="block font-bold text-slate-700 truncate" title={trip?.chofer_viaje || '-'}>
                {trip?.chofer_viaje || '-'}
              </span>
            </div>
            <div className="min-w-0">
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">FECHA / HORA</span>
              <span className="block font-bold text-slate-700 truncate" title={`${trip?.fecha_viaje || ''} ${trip?.hora_salida ? `(${trip?.hora_salida})` : ''}`}>
                {trip?.fecha_viaje} {trip?.hora_salida ? `(${trip?.hora_salida})` : ''}
              </span>
            </div>
          </div>

          {/* Warning Note */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800">
            <i className="fas fa-exclamation-triangle text-amber-500 text-sm mt-0.5 shrink-0"></i>
            <div className="text-[11px] leading-relaxed space-y-1">
              <p className="font-bold">Efectos de la reversión:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 font-medium">
                <li>El viaje volverá al estado <span className="font-bold text-emerald-700">"En Curso"</span>.</li>
                <li>Las <span className="font-bold text-slate-800">multas y deudas de socio</span> deducidas regresarán a su saldo pendiente.</li>
                <li>Los <span className="font-bold text-slate-800">cobros del bus</span> retenidos volverán a estar pendientes.</li>
                <li>Se guardará un historial de auditoría con el usuario y motivo.</li>
              </ul>
            </div>
          </div>

          {/* Motivo Input */}
          <div>
            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1.5">
              Motivo de la Reversión <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describa el motivo por el cual se reversa el despacho (requerido)..."
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all resize-none bg-white placeholder:text-slate-400"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 px-4 text-xs font-black text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all uppercase tracking-wider"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !motivo.trim()}
              className="h-9 px-5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 uppercase tracking-wider shadow-sm"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Reversando...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-undo-alt"></i>
                  <span>Confirmar Reversión</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalReversarDespacho;
