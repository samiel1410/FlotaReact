import { useState, useEffect } from 'react';

const DENOMINACIONES = [
  { key: 'cierre_100_caja', label: '$100', valor: 100, color: 'blue' },
  { key: 'cierre_50_caja', label: '$50', valor: 50, color: 'purple' },
  { key: 'cierre_20_caja', label: '$20', valor: 20, color: 'green' },
  { key: 'cierre_10_caja', label: '$10', valor: 10, color: 'emerald' },
  { key: 'cierre_5_caja', label: '$5', valor: 5, color: 'yellow' },
  { key: 'cierre_1_caja', label: '$1', valor: 1, color: 'slate' },
];

const MONEDAS = [
  { key: 'cierre_moneda_caja', label: '$1.00', valor: 1, color: 'amber' },
  { key: 'cierre_moneda_50_caja', label: '50¢', valor: 0.5, color: 'orange' },
  { key: 'cierre_moneda_25_caja', label: '25¢', valor: 0.25, color: 'red' },
  { key: 'cierre_moneda_10_caja', label: '10¢', valor: 0.1, color: 'pink' },
  { key: 'cierre_moneda_5_caja', label: '5¢', valor: 0.05, color: 'indigo' },
  { key: 'cierre_moneda_1_caja', label: '1¢', valor: 0.01, color: 'slate' },
];

export const CierreCajaForm = ({ cajaActual, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({});
  const [subtotalBilletes, setSubtotalBilletes] = useState(0);
  const [subtotalMonedas, setSubtotalMonedas] = useState(0);
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [bancoCierre, setBancoCierre] = useState('');

  useEffect(() => {
    const initial = {};
    [...DENOMINACIONES, ...MONEDAS].forEach(d => { initial[d.key] = 0; });
    setFormData(initial);
  }, []);

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
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({ ...prev, [key]: numValue }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, cierre_total_caja: totalGeneral, numero_comprobante_cierre: numeroComprobante, banco_cierre: bancoCierre });
  };

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(monto || 0);
  };

  const inputClass = "w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800 text-center font-bold";

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

  // Lo que debe quedar FÍSICAMENTE en la oficina es lo RETENIDO en los
  // despachos: el resto de la venta se entrega al bus.
  const tieneDesglose = cajaActual && cajaActual.total_vendido !== undefined;
  const totalVendido = Number(cajaActual?.total_vendido) || 0;
  const totalRetenido = Number(cajaActual?.total_retenido) || 0;
  const totalEntregado = Number(cajaActual?.total_entregado) || 0;

  // Esperado en caja = lo que había al abrir + lo retenido en el período.
  const esperadoEnCaja = (Number(cajaActual?.apertura_total_caja) || 0) + totalRetenido;
  const diferenciaEsperado = totalGeneral - esperadoEnCaja;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Info caja abierta */}
      {cajaActual && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Apertura de Caja</p>
            <p className="text-lg font-black text-slate-700">{formatMonto(cajaActual.apertura_total_caja)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500 uppercase">ID Caja</p>
            <p className="text-lg font-black text-slate-700">#{cajaActual.id_caja}</p>
          </div>
        </div>
      )}

      {/* Desglose de la caja: vendido / retenido / entregado */}
      {tieneDesglose && (
        <div className="rounded-2xl border-2 border-slate-200 overflow-hidden">
          <div className="bg-slate-100 px-4 py-2">
            <p className="text-[11px] font-black text-slate-600 uppercase tracking-wider">Resumen de la caja</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <div className="p-4 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total vendido</p>
              <p className="text-2xl font-black text-slate-800 font-mono">{formatMonto(totalVendido)}</p>
              <p className="text-[10px] text-slate-400">Boletos de esta caja</p>
            </div>
            <div className="p-4 text-center bg-amber-50">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Total retenido</p>
              <p className="text-2xl font-black text-amber-700 font-mono">{formatMonto(totalRetenido)}</p>
              <p className="text-[10px] text-amber-600 font-bold">Queda en la oficina</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total entregado</p>
              <p className="text-2xl font-black text-indigo-700 font-mono">{formatMonto(totalEntregado)}</p>
              <p className="text-[10px] text-slate-400">Se entrega al bus</p>
            </div>
          </div>
          <div className="bg-amber-50 border-t border-amber-200 px-4 py-2">
            <p className="text-[11px] font-bold text-amber-800">
              <i className="fas fa-info-circle mr-1"></i>
              El efectivo a entregar en el cierre debe coincidir con el <b>Total retenido</b> ({formatMonto(totalRetenido)}), no con la venta total.
            </p>
          </div>
        </div>
      )}

      {/* Billetes */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-money-bill text-red-600 text-sm"></i>
          </div>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Billetes de Cierre</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {DENOMINACIONES.map((denom) => (
            <div key={denom.key} className={`p-3 rounded-xl border ${colorMap[denom.color]} transition-all hover:shadow-sm`}>
              <label className="text-center block mb-2">
                <span className="text-lg font-black">{denom.label}</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData[denom.key] || ''}
                onChange={(e) => handleChange(denom.key, e.target.value)}
                className={inputClass}
                placeholder="0"
              />
              <p className="text-center text-xs font-bold mt-2 opacity-75">
                = ${((Number(formData[denom.key]) || 0) * denom.valor).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
        <div className="text-right mt-2">
          <span className="text-sm font-bold text-slate-600">Subtotal Billetes: </span>
          <span className="text-lg font-black text-red-700">${subtotalBilletes.toFixed(2)}</span>
        </div>
      </div>

      {/* Monedas */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-coins text-amber-600 text-sm"></i>
          </div>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Monedas de Cierre</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {MONEDAS.map((denom) => (
            <div key={denom.key} className={`p-3 rounded-xl border ${colorMap[denom.color]} transition-all hover:shadow-sm`}>
              <label className="text-center block mb-2">
                <span className="text-lg font-black">{denom.label}</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData[denom.key] || ''}
                onChange={(e) => handleChange(denom.key, e.target.value)}
                className={inputClass}
                placeholder="0"
              />
              <p className="text-center text-xs font-bold mt-2 opacity-75">
                = ${((Number(formData[denom.key]) || 0) * denom.valor).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
        <div className="text-right mt-2">
          <span className="text-sm font-bold text-slate-600">Subtotal Monedas: </span>
          <span className="text-lg font-black text-amber-700">${subtotalMonedas.toFixed(2)}</span>
        </div>
      </div>

      {/* Resumen */}
      <div className={`rounded-2xl p-6 text-center border-2 ${
        Math.abs(diferenciaEsperado) < 0.01
          ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
          : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
      }`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Apertura</p>
            <p className="text-xl font-black text-slate-700">{formatMonto(cajaActual?.apertura_total_caja || 0)}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase">Retenido</p>
            <p className="text-xl font-black text-amber-700">{formatMonto(totalRetenido)}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Esperado en caja</p>
            <p className="text-xl font-black text-slate-700">{formatMonto(esperadoEnCaja)}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Contado</p>
            <p className="text-xl font-black text-slate-700">{formatMonto(totalGeneral)}</p>
          </div>
        </div>
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-500 uppercase">Diferencia</p>
          <p className={`text-xl font-black ${Math.abs(diferenciaEsperado) < 0.01 ? 'text-emerald-700' : 'text-red-700'}`}>
            {diferenciaEsperado >= 0 ? '+' : ''}{formatMonto(diferenciaEsperado)}
          </p>
        </div>
        <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Total Cierre</p>
        <p className="text-3xl font-black text-slate-800">{formatMonto(totalGeneral)}</p>
      </div>

      {/* Comprobante y Banco */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">N° Comprobante</label>
          <input
            type="text"
            value={numeroComprobante}
            onChange={(e) => setNumeroComprobante(e.target.value)}
            className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800"
            placeholder="N° de comprobante"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Banco</label>
          <input
            type="text"
            value={bancoCierre}
            onChange={(e) => setBancoCierre(e.target.value)}
            className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white text-slate-800"
            placeholder="Nombre del banco"
          />
        </div>
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
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2"
        >
          <i className="fas fa-door-closed"></i>
          Cerrar Caja
        </button>
      </div>
    </form>
  );
};

export default CierreCajaForm;