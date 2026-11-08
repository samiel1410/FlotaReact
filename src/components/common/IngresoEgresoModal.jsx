import { useState } from 'react';

export default function IngresoEgresoModal({ isOpen, onClose, onConfirm }) {
  const [tipo, setTipo] = useState('INGRESO');
  const [monto, setMonto] = useState('0');
  const [socio, setSocio] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [observacion, setObservacion] = useState('');
  // Evita el doble envío: un segundo clic mientras se guarda duplicaba el
  // movimiento en caja_detalle.
  const [enviando, setEnviando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    try {
      await onConfirm({
        tipo_caja_detalle: tipo,
        monto_caja_detalle: parseFloat(monto) || 0,
        nombre_socio: socio,
        numero_documento: numeroDocumento,
        observacion_caja_detalle: observacion
      });
      setMonto('0');
      setSocio('');
      setNumeroDocumento('');
      setObservacion('');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Agregar Movimiento (Ingreso / Egreso)</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Movimiento</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="INGRESO">INGRESO</option>
              <option value="EGRESO">EGRESO</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Monto ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-right font-mono font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Socio / Concepto</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={socio}
              onChange={(e) => setSocio(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">N° Documento</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Observación</label>
            <textarea
              rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
            />
          </div>
          <p className="text-[10px] text-amber-600 font-semibold bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            El movimiento quedará <b>PENDIENTE</b> hasta que un administrador lo apruebe.
          </p>
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={enviando}
              className="px-4 py-2 text-xs font-bold border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm disabled:bg-emerald-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {enviando && <i className="fas fa-spinner fa-spin"></i>}
              {enviando ? 'Guardando...' : 'Guardar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
