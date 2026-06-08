export const DetalleCajaGrid = ({ detalle, loading, idCaja, onRefresh }) => {
  const formatMonto = (monto) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(monto || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTipoBadge = (tipo) => {
    const badges = {
      venta: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'fa-tag' },
      abono: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'fa-hand-holding-usd' },
      cobro: { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'fa-dollar-sign' },
      egreso: { bg: 'bg-red-100', text: 'text-red-700', icon: 'fa-arrow-down' },
      anulacion: { bg: 'bg-orange-100', text: 'text-orange-700', icon: 'fa-ban' },
      devolucion: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: 'fa-undo' },
    };
    const badge = badges[tipo?.toLowerCase()] || { bg: 'bg-slate-100', text: 'text-slate-700', icon: 'fa-circle' };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
        <i className={`fas ${badge.icon} text-[10px]`}></i>
        {tipo || 'N/A'}
      </span>
    );
  };

  // Calcular totales
  const totalIngresos = detalle
    ?.filter(d => !['egreso', 'anulacion', 'devolucion'].includes(d.tipo_movimiento?.toLowerCase()))
    .reduce((sum, d) => sum + (parseFloat(d.monto_movimiento) || 0), 0) || 0;

  const totalEgresos = detalle
    ?.filter(d => ['egreso', 'anulacion', 'devolucion'].includes(d.tipo_movimiento?.toLowerCase()))
    .reduce((sum, d) => sum + (parseFloat(d.monto_movimiento) || 0), 0) || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Movimientos de la caja <span className="font-bold text-slate-700">#{idCaja}</span>
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all"
        >
          <i className="fas fa-sync-alt mr-1"></i>Actualizar
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-xs font-bold text-emerald-600 uppercase">Ingresos</p>
          <p className="text-lg font-black text-emerald-700">{formatMonto(totalIngresos)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-xs font-bold text-red-600 uppercase">Egresos</p>
          <p className="text-lg font-black text-red-700">{formatMonto(totalEgresos)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-xs font-bold text-blue-600 uppercase">Neto</p>
          <p className="text-lg font-black text-blue-700">{formatMonto(totalIngresos - totalEgresos)}</p>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <i className="fas fa-circle-notch fa-spin text-3xl text-blue-500"></i>
        </div>
      ) : !detalle || detalle.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <i className="fas fa-inbox text-4xl mb-3"></i>
          <p className="font-medium">No hay movimientos registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 font-bold text-slate-600 uppercase text-xs">Fecha</th>
                <th className="text-left py-2 px-3 font-bold text-slate-600 uppercase text-xs">Tipo</th>
                <th className="text-left py-2 px-3 font-bold text-slate-600 uppercase text-xs">Concepto</th>
                <th className="text-left py-2 px-3 font-bold text-slate-600 uppercase text-xs">Responsable</th>
                <th className="text-right py-2 px-3 font-bold text-slate-600 uppercase text-xs">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detalle.map((mov, index) => {
                const esEgreso = ['egreso', 'anulacion', 'devolucion'].includes(mov.tipo_movimiento?.toLowerCase());
                return (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 text-slate-600 text-xs whitespace-nowrap">
                      {formatDate(mov.fecha_movimiento)}
                    </td>
                    <td className="py-2 px-3">
                      {getTipoBadge(mov.tipo_movimiento)}
                    </td>
                    <td className="py-2 px-3 text-slate-700 max-w-xs truncate">
                      {mov.concepto_movimiento || mov.descripcion || '-'}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {mov.responsable || mov.usuario || '-'}
                    </td>
                    <td className={`py-2 px-3 text-right font-bold ${esEgreso ? 'text-red-700' : 'text-emerald-700'}`}>
                      {esEgreso ? '-' : '+'}{formatMonto(mov.monto_movimiento)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DetalleCajaGrid;