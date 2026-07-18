import { useState } from 'react';
import Modal from './Modal';
import { cajaCobrosService } from '../../services/cajaCobros.service';
import toast from 'react-hot-toast';

const DENOMINACIONES = [
  { key: 'b100',  label: 'Billetes $100',  field: 'apertura_100_caja',      mult: 100 },
  { key: 'b50',   label: 'Billetes $50',   field: 'apertura_50_caja',       mult: 50 },
  { key: 'b20',   label: 'Billetes $20',   field: 'apertura_20_caja',       mult: 20 },
  { key: 'b10',   label: 'Billetes $10',   field: 'apertura_10_caja',       mult: 10 },
  { key: 'b5',    label: 'Billetes $5',    field: 'apertura_5_caja',        mult: 5  },
  { key: 'b1',    label: 'Billetes $1',    field: 'apertura_1_caja',        mult: 1  },
  { key: 'm1',    label: 'Monedas $1',     field: 'apertura_moneda_caja',   mult: 1  },
  { key: 'm50',   label: 'Monedas $0.50', field: 'apertura_moneda_50_caja', mult: 0.5 },
  { key: 'm25',   label: 'Monedas $0.25', field: 'apertura_moneda_25_caja', mult: 0.25 },
  { key: 'm10',   label: 'Monedas $0.10', field: 'apertura_moneda_10_caja', mult: 0.10 },
  { key: 'm5',    label: 'Monedas $0.05', field: 'apertura_moneda_5_caja',  mult: 0.05 },
  { key: 'm1c',   label: 'Monedas $0.01', field: 'apertura_moneda_1_caja',  mult: 0.01 },
];

const initial = () => Object.fromEntries(DENOMINACIONES.map(d => [d.key, '']));

const AperturaCajaCobrosModal = ({ isOpen, onClose, onSuccess }) => {
  const [valores, setValores] = useState(initial());
  const [ceroEnabled, setCeroEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const total = DENOMINACIONES.reduce((acc, d) => acc + (parseFloat(valores[d.key]) || 0) * d.mult, 0);

  const handleChange = (key, val) => {
    if (ceroEnabled) return;
    setValores(v => ({ ...v, [key]: val }));
  };

  const handleCeroToggle = (checked) => {
    setCeroEnabled(checked);
    if (checked) setValores(initial());
  };

  const handleGuardar = async () => {
    setLoading(true);
    try {
      const payload = { apertura_total_caja: ceroEnabled ? 0 : total };
      DENOMINACIONES.forEach(d => {
        payload[d.field] = ceroEnabled ? 0 : (parseFloat(valores[d.key]) || 0);
      });
      const res = await cajaCobrosService.insertarAperturaCaja(payload);
      if (res.success) {
        toast.success('Caja aperturada correctamente');
        setValores(initial());
        setCeroEnabled(false);
        onSuccess?.();
      } else {
        toast.error(res.message || 'Error al aperturar caja');
      }
    } catch (err) {
      toast.error(err.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva Apertura de Caja de Cobros" width="max-w-lg">
      <div className="space-y-4 p-1">

        {/* Toggle $0.00 */}
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          <span className="text-xs font-bold text-amber-800">Aperturar en $0.00 (sin efectivo)</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => handleCeroToggle(!ceroEnabled)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${ceroEnabled ? 'bg-amber-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${ceroEnabled ? 'left-5' : 'left-0.5'}`} />
            </div>
          </label>
        </div>

        {/* Denominaciones */}
        <div className="grid grid-cols-2 gap-2">
          {DENOMINACIONES.map(d => (
            <div key={d.key}>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{d.label}</label>
              <input
                type="number"
                min="0"
                step="1"
                disabled={ceroEnabled}
                value={valores[d.key]}
                onChange={e => handleChange(d.key, e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-right font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 disabled:bg-slate-100 disabled:text-slate-400"
                placeholder="0"
              />
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <span className="text-sm font-black text-indigo-800 uppercase tracking-wide">Total Apertura</span>
          <span className="text-2xl font-black text-indigo-700 font-mono">
            ${ceroEnabled ? '0.00' : total.toFixed(2)}
          </span>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={loading}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-95 flex items-center gap-2"
          >
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-door-open"></i>}
            Aperturar Caja
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AperturaCajaCobrosModal;
