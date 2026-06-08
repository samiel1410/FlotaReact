import { useState, useEffect } from 'react';
import { format } from 'date-fns';

const DENOMINACIONES = [
  { key: 'apertura_100_caja', label: '$100', valor: 100, icono: 'fa-money-bill-100', color: 'blue' },
  { key: 'apertura_50_caja', label: '$50', valor: 50, icono: 'fa-money-bill', color: 'purple' },
  { key: 'apertura_20_caja', label: '$20', valor: 20, icono: 'fa-money-bill', color: 'green' },
  { key: 'apertura_10_caja', label: '$10', valor: 10, icono: 'fa-money-bill', color: 'emerald' },
  { key: 'apertura_5_caja', label: '$5', valor: 5, icono: 'fa-money-bill', color: 'yellow' },
  { key: 'apertura_1_caja', label: '$1', valor: 1, icono: 'fa-money-bill', color: 'slate' },
];

const MONEDAS = [
  { key: 'apertura_moneda_caja', label: '$1.00', valor: 1, icono: 'fa-coins', color: 'amber' },
  { key: 'apertura_moneda_50_caja', label: '50¢', valor: 0.5, icono: 'fa-coins', color: 'orange' },
  { key: 'apertura_moneda_25_caja', label: '25¢', valor: 0.25, icono: 'fa-coins', color: 'red' },
  { key: 'apertura_moneda_10_caja', label: '10¢', valor: 0.1, icono: 'fa-coins', color: 'pink' },
  { key: 'apertura_moneda_5_caja', label: '5¢', valor: 0.05, icono: 'fa-coins', color: 'indigo' },
  { key: 'apertura_moneda_1_caja', label: '1¢', valor: 0.01, icono: 'fa-coins', color: 'slate' },
];

const FECHA_HOY = format(new Date(), 'yyyy-MM-dd');
const HORA_ACTUAL = format(new Date(), 'HH:mm:ss');

export const AperturaCajaForm = ({ initialData, isEditing = false, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({});
  const [subtotalBilletes, setSubtotalBilletes] = useState(0);
  const [subtotalMonedas, setSubtotalMonedas] = useState(0);
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [aperturarCero, setAperturarCero] = useState(false);
  const [fechaApertura] = useState(FECHA_HOY);
  const [horaApertura] = useState(HORA_ACTUAL);

  useEffect(() => {
    if (initialData && isEditing) {
      setFormData(initialData);
    } else {
      const initial = {};
      [...DENOMINACIONES, ...MONEDAS].forEach(d => { initial[d.key] = 0; });
      setFormData(initial);
    }
  }, [initialData, isEditing]);

  useEffect(() => {
    let subBilletes = 0;
    let subMonedas = 0;

    DENOMINACIONES.forEach(d => {
      const cantidad = Number(formData[d.key]) || 0;
      subBilletes += cantidad * d.valor;
    });

    MONEDAS.forEach(d => {
      const cantidad = Number(formData[d.key]) || 0;
      subMonedas += cantidad * d.valor;
    });

    setSubtotalBilletes(subBilletes);
    setSubtotalMonedas(subMonedas);
    setTotalGeneral(subBilletes + subMonedas);
  }, [formData]);

  const handleChange = (key, value) => {
    if (aperturarCero) setAperturarCero(false);
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({ ...prev, [key]: numValue }));
  };

  const handleAperturarCero = (checked) => {
    setAperturarCero(checked);
    if (checked) {
      const zeroed = {};
      [...DENOMINACIONES, ...MONEDAS].forEach(d => { zeroed[d.key] = 0; });
      setFormData(zeroed);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      apertura_total_caja: totalGeneral,
      fecha_apertura: fechaApertura,
      hora_apertura_caja: horaApertura,
    });
  };

  const inputClass = "w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800 text-center font-bold";
  const labelClass = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1";

  const colorMap = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header con Fecha/Hora */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/50 border border-slate-200 rounded-xl px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
            <i className="fas fa-cash-register text-emerald-600 text-sm"></i>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">Apertura de Caja</h3>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Registrar apertura</p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-xs">
          <div className="text-right">
            <p className="font-bold text-slate-500 uppercase tracking-wider">Fecha</p>
            <p className="font-extrabold text-slate-800">{fechaApertura}</p>
          </div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="text-right">
            <p className="font-bold text-slate-500 uppercase tracking-wider">Hora</p>
            <p className="font-extrabold text-slate-800">{horaApertura}</p>
          </div>
        </div>
      </div>

      {/* Columnas: izquierda Monedas, derecha Billetes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monedas (izquierda) */}
        <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-coins text-amber-600 text-[10px]"></i>
            </div>
            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Monedas</h3>
          </div>
          <div className="space-y-2">
            {MONEDAS.map((denom) => (
              <div key={denom.key} className={`flex items-center gap-2 p-2 rounded-lg border ${colorMap[denom.color]}`}>
                <span className="w-12 text-xs font-black text-center">{denom.label}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData[denom.key] || ''}
                  onChange={(e) => handleChange(denom.key, e.target.value)}
                  className="w-16 h-8 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white text-slate-800 text-center font-bold"
                  placeholder="0"
                />
                <span className="text-[10px] font-bold opacity-60 flex-1 text-right">
                  = ${((Number(formData[denom.key]) || 0) * denom.valor).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="text-right mt-2 pt-2 border-t border-amber-200">
            <span className="text-[10px] font-bold text-slate-500">Subtotal: </span>
            <span className="text-sm font-black text-amber-700">${subtotalMonedas.toFixed(2)}</span>
          </div>
        </div>

        {/* Billetes (derecha) */}
        <div className="bg-blue-50/40 border border-blue-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-money-bill text-blue-600 text-[10px]"></i>
            </div>
            <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Billetes</h3>
          </div>
          <div className="space-y-2">
            {DENOMINACIONES.map((denom) => (
              <div key={denom.key} className={`flex items-center gap-2 p-2 rounded-lg border ${colorMap[denom.color]}`}>
                <span className="w-12 text-xs font-black text-center">{denom.label}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData[denom.key] || ''}
                  onChange={(e) => handleChange(denom.key, e.target.value)}
                  className="w-16 h-8 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white text-slate-800 text-center font-bold"
                  placeholder="0"
                />
                <span className="text-[10px] font-bold opacity-60 flex-1 text-right">
                  = ${((Number(formData[denom.key]) || 0) * denom.valor).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="text-right mt-2 pt-2 border-t border-blue-200">
            <span className="text-[10px] font-bold text-slate-500">Subtotal: </span>
            <span className="text-sm font-black text-blue-700">${subtotalBilletes.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Aperturar con $0.00 */}
      <label className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors select-none">
        <input
          type="checkbox"
          checked={aperturarCero}
          onChange={(e) => handleAperturarCero(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        <div>
          <span className="text-sm font-bold text-slate-700">Aperturar con $0.00</span>
          <p className="text-[10px] text-slate-400 font-medium">Establece todas las denominaciones en cero</p>
        </div>
      </label>

      {/* Total */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-5 text-center">
        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Apertura</p>
        <p className="text-3xl font-black text-emerald-700">${totalGeneral.toFixed(2)}</p>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-bold transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2"
        >
          <i className="fas fa-save"></i>
          {isEditing ? 'Guardar Cambios' : 'Abrir Caja'}
        </button>
      </div>
    </form>
  );
};

export default AperturaCajaForm;