const formatFecha = (f) => {
  if (!f || f === '0000-00-00' || String(f).startsWith('0000-00-00')) return 'Sin fecha';
  try {
    const d = new Date(f);
    if (isNaN(d.getTime())) return 'Sin fecha';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return 'Sin fecha';
  }
};

export const DespachoRetencionesModal = ({
  valores,
  deudas,
  unidad,
  viajeDesc,
  onClose,
}) => {
  const retenciones = valores?.retenciones_detalle || [];
  const deudasItems = deudas?.items || [];

  const totalRetenciones = parseFloat(valores?.retencion || 0);
  const totalBoletos = parseFloat(valores?.boletos || 0);
  const totalEntrega = parseFloat(valores?.entrega || 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shadow-sm">
              <i className="fas fa-receipt text-lg" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">
                Desglose de Retenciones y Gastos
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {viajeDesc} {unidad?.numero_unidad ? `— Bus ${unidad.numero_unidad}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
          >
            <i className="fas fa-times text-sm" />
          </button>
        </div>

        {/* Resumen Superior */}
        <div className="p-5 bg-gradient-to-r from-slate-50 via-rose-50/30 to-slate-50 border-b border-slate-200 shrink-0 grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm text-center">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Recaudación Boletos</span>
            <span className="text-base font-black font-mono text-blue-900 mt-0.5 block">${totalBoletos.toFixed(2)}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-rose-200 shadow-sm text-center">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Total Retenido</span>
            <span className="text-base font-black font-mono text-rose-600 mt-0.5 block">-${totalRetenciones.toFixed(2)}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm text-center">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Neto a Entregar</span>
            <span className="text-base font-black font-mono text-emerald-700 mt-0.5 block">${totalEntrega.toFixed(2)}</span>
          </div>
        </div>

        {/* Contenido / Listado */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-2">
              <i className="fas fa-list-ul text-rose-500" />
              Retenciones Aplicadas al Viaje ({retenciones.length})
            </h4>

            {retenciones.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400">
                <i className="fas fa-hand-holding-usd text-3xl text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">No hay retenciones registradas</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Este viaje no tiene comisiones ni cobros pendientes asignados.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                      <th className="px-3 py-2.5 text-center w-10">#</th>
                      <th className="px-3 py-2.5 text-left">Concepto / Retención</th>
                      <th className="px-3 py-2.5 text-left">Detalle / Observación</th>
                      <th className="px-3 py-2.5 text-center w-28">Fecha</th>
                      <th className="px-3 py-2.5 text-right w-24">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {retenciones.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            {item.tipo === 'COMISION' ? (
                              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            )}
                            <span>{item.nombre}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                          {item.observacion || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-[11px] text-slate-600">
                          {item.tipo === 'COMISION' ? (
                            <span className="text-blue-600 font-semibold text-[10px] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                              En despacho
                            </span>
                          ) : item.fecha && item.fecha !== '0000-00-00' && !String(item.fecha).startsWith('0000-00-00') ? (
                            <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-slate-700 font-medium">
                              <i className="far fa-calendar-alt text-[9px] text-slate-400" />
                              {formatFecha(item.fecha)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">Sin fecha reg.</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-black font-mono text-rose-600 text-[12px]">
                          -${parseFloat(item.monto || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-rose-50/60 border-t-2 border-rose-200 text-slate-800 font-extrabold">
                      <td colSpan={4} className="px-3 py-2.5 text-right uppercase tracking-wider text-[11px] text-rose-800">
                        Total Retenciones / Gastos:
                      </td>
                      <td className="px-3 py-2.5 text-right font-black font-mono text-rose-700 text-sm">
                        -${totalRetenciones.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Sección adicional: Otras deudas pendientes del bus (si existen) */}
          {deudasItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-2">
                <i className="fas fa-exclamation-circle text-amber-500" />
                Otras Deudas Pendientes de la Unidad ({deudasItems.length})
              </h4>
              <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/30">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-amber-100/50 border-b border-amber-200 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                      <th className="px-4 py-2 text-left">Tipo de Deuda</th>
                      <th className="px-4 py-2 text-right w-28">Saldo Pendiente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {deudasItems.map((d, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 font-medium text-slate-700">{d.tipo_nombre || 'Deuda'}</td>
                        <td className="px-4 py-2 text-right font-black font-mono text-amber-800">
                          ${parseFloat(d.saldo_pendiente || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Botón de cierre */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-sm transition-all active:scale-95"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DespachoRetencionesModal;
