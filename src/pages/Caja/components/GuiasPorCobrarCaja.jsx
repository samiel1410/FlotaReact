const formatMonto = (valor) => `$${Number(valor || 0).toFixed(2)}`;

export const GuiasPorCobrarCaja = ({ guias = [], loading = false, error = '' }) => {
  const totalPorCobrar = guias.reduce((total, guia) => total + (Number(guia.por_cobrar) || 0), 0);

  return (
    <section className="rounded-xl border border-rose-200 bg-white overflow-hidden">
      <div className="px-4 py-3 bg-rose-50 border-b border-rose-100 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-black text-rose-800 uppercase tracking-wide">
            <i className="fas fa-hand-holding-usd mr-2"></i>Guías con saldo por cobrar
          </h3>
          <p className="text-[11px] text-rose-700 mt-1">
            Caja y guías entregadas de esta oficina. Es un saldo pendiente: todavía no es dinero recibido.
          </p>
        </div>
        <div className="text-right">
          <span className="block text-[10px] font-bold text-rose-600 uppercase">Total pendiente</span>
          <span className="font-mono font-black text-rose-800">
            {loading || error ? '—' : formatMonto(totalPorCobrar)}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-5 text-center text-sm text-slate-500">
          <i className="fas fa-spinner fa-spin mr-2"></i>Consultando saldos...
        </div>
      ) : error ? (
        <div className="p-4 text-sm text-rose-700" role="alert">
          <i className="fas fa-exclamation-circle mr-2"></i>{error}
        </div>
      ) : guias.length === 0 ? (
        <div className="p-4 text-sm text-slate-500">No hay guías con saldo pendiente en esta caja.</div>
      ) : (
        <div className="overflow-auto max-h-72">
          <table className="w-full min-w-[800px] text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Guía</th>
                <th className="px-3 py-2">Origen</th>
                <th className="px-3 py-2">Factura</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Cobrado</th>
                <th className="px-3 py-2 text-right">Por cobrar</th>
                <th className="px-3 py-2">Comprobantes de cobro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {guias.map((guia) => (
                <tr key={`${guia.origen || 'CAJA'}-${guia.id_guia}`} className="hover:bg-rose-50/50">
                  <td className="px-3 py-2 font-mono font-bold text-slate-700">
                    {guia.punto_emision_sucursal && `${guia.punto_emision_sucursal}-`}
                    {guia.punto_emision_guia && `${guia.punto_emision_guia}-`}
                    {guia.numero_guia || `ID ${guia.id_guia}`}
                    {guia.numero_manual_guia && (
                      <span className="block text-[10px] font-normal text-slate-500">Manual: {guia.numero_manual_guia}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      guia.origen === 'ENTREGADA'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {guia.origen === 'ENTREGADA' ? 'Entregada' : 'Caja'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{guia.numeros_factura || '-'}</td>
                  <td className="px-3 py-2 text-slate-700">{guia.cliente || '-'}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatMonto(guia.total_guia)}</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">{formatMonto(guia.total_cobrado)}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 font-mono font-black text-rose-800">
                      <i className="fas fa-clock text-[9px]"></i>{formatMonto(guia.por_cobrar)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{guia.comprobantes_cobro || 'Sin cobros registrados'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default GuiasPorCobrarCaja;
