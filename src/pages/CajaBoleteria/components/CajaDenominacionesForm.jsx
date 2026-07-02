import { useState, useEffect } from 'react';
import { format } from 'date-fns';

/**
 * Componente unificado para Apertura y Cierre de Caja.
 * 
 * Props:
 *   mode        : 'apertura' | 'cierre'
 *   cajaActual  : objeto con datos de la caja (solo para mode='cierre')
 *   initialData : datos iniciales para modo edición
 *   isEditing   : boolean (solo mode='apertura')
 *   onSubmit    : (formData) => void
 *   onCancel    : () => void
 *   onClose     : () => void  (alias de onCancel, por compatibilidad con GenericListPage)
 */

const BILLETES = [
  { label: '$100', valor: 100, color: 'blue'    },
  { label: '$50',  valor: 50,  color: 'purple'  },
  { label: '$20',  valor: 20,  color: 'green'   },
  { label: '$10',  valor: 10,  color: 'emerald' },
  { label: '$5',   valor: 5,   color: 'yellow'  },
  { label: '$1',   valor: 1,   color: 'slate'   },
];

const MONEDAS = [
  { label: '$1.00', valor: 1,    color: 'amber'  },
  { label: '50¢',   valor: 0.50, color: 'orange' },
  { label: '25¢',   valor: 0.25, color: 'red'    },
  { label: '10¢',   valor: 0.10, color: 'pink'   },
  { label: '5¢',    valor: 0.05, color: 'indigo' },
  { label: '1¢',    valor: 0.01, color: 'slate'  },
];

const colorMap = {
  blue:    'bg-blue-50    border-blue-200    text-blue-700',
  purple:  'bg-purple-50  border-purple-200  text-purple-700',
  green:   'bg-green-50   border-green-200   text-green-700',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  yellow:  'bg-yellow-50  border-yellow-200  text-yellow-700',
  amber:   'bg-amber-50   border-amber-200   text-amber-700',
  orange:  'bg-orange-50  border-orange-200  text-orange-700',
  red:     'bg-red-50     border-red-200     text-red-700',
  pink:    'bg-pink-50    border-pink-200    text-pink-700',
  indigo:  'bg-indigo-50  border-indigo-200  text-indigo-700',
  slate:   'bg-slate-50   border-slate-200   text-slate-700',
};

const buildKeys = (prefix, denom) => ({
  billetes: denom.map((d, i) => ({ ...BILLETES[i], key: `${prefix}_${[100,50,20,10,5,1][i]}_caja` })),
  monedas:  denom.map((d, i) => ({
    ...MONEDAS[i],
    key: `${prefix}_moneda${['','_50','_25','_10','_5','_1'][i]}_caja`
  })),
});

const APERTURA_BILLETES = BILLETES.map((d, i) => ({
  ...d, key: `apertura_${[100,50,20,10,5,1][i]}_caja`
}));
const APERTURA_MONEDAS = MONEDAS.map((d, i) => ({
  ...d, key: ['apertura_moneda_caja','apertura_moneda_50_caja','apertura_moneda_25_caja','apertura_moneda_10_caja','apertura_moneda_5_caja','apertura_moneda_1_caja'][i]
}));
const CIERRE_BILLETES = BILLETES.map((d, i) => ({
  ...d, key: `cierre_${[100,50,20,10,5,1][i]}_caja`
}));
const CIERRE_MONEDAS = MONEDAS.map((d, i) => ({
  ...d, key: ['cierre_moneda_caja','cierre_moneda_50_caja','cierre_moneda_25_caja','cierre_moneda_10_caja','cierre_moneda_5_caja','cierre_moneda_1_caja'][i]
}));

const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v || 0);

export const CajaDenominacionesForm = ({
  mode = 'apertura',
  cajaActual = null,
  initialData = null,
  isEditing = false,
  onSubmit,
  onCancel,
  onClose,
}) => {
  const handleCancel = onCancel || onClose;
  const isApertura = mode === 'apertura';

  const billetes = isApertura ? APERTURA_BILLETES : CIERRE_BILLETES;
  const monedas  = isApertura ? APERTURA_MONEDAS  : CIERRE_MONEDAS;
  const allDenoms = [...billetes, ...monedas];

  const [formData, setFormData]           = useState({});
  const [subtotalBilletes, setSubB]       = useState(0);
  const [subtotalMonedas, setSubM]        = useState(0);
  const [total, setTotal]                 = useState(0);
  const [aperturarCero, setAperturarCero] = useState(false);
  const [fechaHora]                       = useState(() => ({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    hora:  format(new Date(), 'HH:mm:ss'),
  }));

  // Inicializar formData
  useEffect(() => {
    if (initialData && isEditing) {
      setFormData(initialData);
    } else {
      const init = {};
      allDenoms.forEach(d => { init[d.key] = 0; });
      setFormData(init);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalcular totales cuando cambia formData
  useEffect(() => {
    let subB = 0, subM = 0;
    billetes.forEach(d => { subB += (Number(formData[d.key]) || 0) * d.valor; });
    monedas.forEach(d => { subM += (Number(formData[d.key]) || 0) * d.valor; });
    setSubB(subB);
    setSubM(subM);
    setTotal(subB + subM);
  }, [formData]);

  const handleChange = (key, value) => {
    if (aperturarCero) setAperturarCero(false);
    setFormData(prev => ({ ...prev, [key]: parseInt(value) || 0 }));
  };

  const handleAperturarCero = (checked) => {
    setAperturarCero(checked);
    if (checked) {
      const zeroed = {};
      allDenoms.forEach(d => { zeroed[d.key] = 0; });
      setFormData(zeroed);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (isApertura) {
      payload.apertura_total_caja   = total;
      payload.fecha_apertura        = fechaHora.fecha;
      payload.hora_apertura_caja    = fechaHora.hora;
    } else {
      payload.cierre_total_caja = total;
    }
    onSubmit(payload);
  };

  const diferencia = isApertura ? null : (total - (cajaActual?.apertura_total_caja || 0));

  const inputCls = 'w-16 h-8 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white text-slate-800 text-center font-bold';

  const DenomRow = ({ denom }) => (
    <div className={`flex items-center gap-2 p-2 rounded-lg border ${colorMap[denom.color]}`}>
      <span className="w-12 text-xs font-black text-center shrink-0">{denom.label}</span>
      <input
        type="number"
        min="0"
        value={formData[denom.key] || ''}
        onChange={e => handleChange(denom.key, e.target.value)}
        className={inputCls}
        placeholder="0"
      />
      <span className="text-[10px] font-bold opacity-60 flex-1 text-right">
        = ${((Number(formData[denom.key]) || 0) * denom.valor).toFixed(2)}
      </span>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/50 border border-slate-200 rounded-xl px-5 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isApertura ? 'bg-emerald-100' : 'bg-rose-100'}`}>
            <i className={`fas ${isApertura ? 'fa-cash-register text-emerald-600' : 'fa-door-closed text-rose-600'} text-sm`}></i>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">
              {isApertura ? (isEditing ? 'Editar Apertura' : 'Apertura de Caja') : 'Cierre de Caja'}
            </h3>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              {isApertura ? 'Ingrese billetes y monedas de apertura' : 'Ingrese billetes y monedas de cierre'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 text-xs">
          {isApertura ? (
            <>
              <div className="text-right">
                <p className="font-bold text-slate-500 uppercase tracking-wider">Fecha</p>
                <p className="font-extrabold text-slate-800">{fechaHora.fecha}</p>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="text-right">
                <p className="font-bold text-slate-500 uppercase tracking-wider">Hora</p>
                <p className="font-extrabold text-slate-800">{fechaHora.hora}</p>
              </div>
            </>
          ) : cajaActual && (
            <>
              <div className="text-right">
                <p className="font-bold text-slate-500 uppercase tracking-wider">Apertura</p>
                <p className="font-extrabold text-emerald-700">{fmt(cajaActual.apertura_total_caja)}</p>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="text-right">
                <p className="font-bold text-slate-500 uppercase tracking-wider">Caja #</p>
                <p className="font-extrabold text-slate-800">{cajaActual.numero_caja || cajaActual.id_caja_boleteria || cajaActual.id_caja}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Monedas | Billetes ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monedas */}
        <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-coins text-amber-600 text-[10px]"></i>
            </div>
            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Monedas</h3>
          </div>
          <div className="space-y-2">
            {monedas.map(d => <DenomRow key={d.key} denom={d} />)}
          </div>
          <div className="text-right mt-2 pt-2 border-t border-amber-200">
            <span className="text-[10px] font-bold text-slate-500">Subtotal: </span>
            <span className="text-sm font-black text-amber-700">${subtotalMonedas.toFixed(2)}</span>
          </div>
        </div>

        {/* Billetes */}
        <div className="bg-blue-50/40 border border-blue-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-money-bill text-blue-600 text-[10px]"></i>
            </div>
            <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Billetes</h3>
          </div>
          <div className="space-y-2">
            {billetes.map(d => <DenomRow key={d.key} denom={d} />)}
          </div>
          <div className="text-right mt-2 pt-2 border-t border-blue-200">
            <span className="text-[10px] font-bold text-slate-500">Subtotal: </span>
            <span className="text-sm font-black text-blue-700">${subtotalBilletes.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ── Aperturar con $0.00 (solo apertura) ── */}
      {isApertura && (
        <label className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors select-none">
          <input
            type="checkbox"
            checked={aperturarCero}
            onChange={e => handleAperturarCero(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <div>
            <span className="text-sm font-bold text-slate-700">Aperturar con $0.00</span>
            <p className="text-[10px] text-slate-400 font-medium">Establece todas las denominaciones en cero</p>
          </div>
        </label>
      )}

      {/* ── Total / Resumen ── */}
      {isApertura ? (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-5 text-center">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Apertura</p>
          <p className="text-3xl font-black text-emerald-700">${total.toFixed(2)}</p>
        </div>
      ) : (
        <div className={`rounded-2xl p-5 border-2 ${
          diferencia !== null && Math.abs(diferencia) < 0.01
            ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
            : 'bg-gradient-to-r from-rose-50 to-orange-50 border-rose-200'
        }`}>
          <div className="grid grid-cols-3 gap-4 mb-3 text-center">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Apertura</p>
              <p className="text-lg font-black text-slate-700">{fmt(cajaActual?.apertura_total_caja || 0)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Cierre</p>
              <p className="text-lg font-black text-slate-700">{fmt(total)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Diferencia</p>
              <p className={`text-lg font-black ${diferencia !== null && Math.abs(diferencia) < 0.01 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {diferencia >= 0 ? '+' : ''}{fmt(diferencia)}
              </p>
            </div>
          </div>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider text-center">Total Cierre</p>
          <p className="text-3xl font-black text-slate-800 text-center">{fmt(total)}</p>
        </div>
      )}

      {/* ── Botones ── */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={handleCancel}
          className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-bold transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className={`px-6 py-2.5 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 ${
            isApertura
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          <i className={`fas ${isApertura ? 'fa-save' : 'fa-door-closed'}`}></i>
          {isApertura ? (isEditing ? 'Guardar Cambios' : 'Abrir Caja') : 'Cerrar Caja'}
        </button>
      </div>
    </form>
  );
};

export default CajaDenominacionesForm;
