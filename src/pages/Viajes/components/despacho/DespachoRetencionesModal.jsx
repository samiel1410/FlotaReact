import React from 'react';

const formatFecha = (f) => {
  if (!f || f === '0000-00-00' || String(f).startsWith('0000-00-00')) return null;
  try {
    const d = new Date(f);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return null;
  }
};

const fmt = (v) => `$${parseFloat(v || 0).toFixed(2)}`;

export const DespachoRetencionesModal = ({
  valores,
  valoresVista,
  sucursalActual,
  deudas,
  unidad,
  viajeDesc,
  onClose,
}) => {
  // Determinar la sucursal activa
  const valoresSucursal = valoresVista?.esPorSucursal
    ? valoresVista
    : (valores?.sucursal_usuario || (valores?.sucursales_desglose?.length === 1 ? valores.sucursales_desglose[0] : null));

  const nombreSucursalActiva = valoresVista?.sucursalNombre || sucursalActual?.nombre_sucursal || valores?.sucursal_usuario?.nombre_sucursal || 'Mi Sucursal';

  // Por defecto mostrar 'SUCURSAL' si hay datos de sucursal
  const [modoVista, setModoVista] = React.useState(valoresSucursal ? 'SUCURSAL' : 'GENERAL');

  const isSucursal = modoVista === 'SUCURSAL' && valoresSucursal;

  const totalBoletos = isSucursal
    ? parseFloat(valoresSucursal?.boletos ?? valoresSucursal?.total_boletos ?? valores?.boletos ?? 0)
    : parseFloat(valores?.boletos ?? 0);

  const totalRetenciones = isSucursal
    ? parseFloat(valoresSucursal?.retencion ?? valoresSucursal?.retencion_monto ?? valoresSucursal?.retencion_calculada ?? valores?.retencion ?? 0)
    : parseFloat(valores?.retencion ?? 0);

  const totalEntrega = isSucursal
    ? parseFloat(valoresSucursal?.entrega ?? (totalBoletos - totalRetenciones))
    : parseFloat(valores?.entrega ?? 0);

  // Filtrar desglose de sucursales según el modo
  const sucursalesDesgloseFiltrado = React.useMemo(() => {
    const todosDesgloses = valores?.sucursales_desglose || [];
    if (!isSucursal) return todosDesgloses;

    const sucId = Number(sucursalActual?.id_sucursal || valoresSucursal?.id_sucursal || 0);
    const sucCod = String(sucursalActual?.suc_codigo || valoresSucursal?.suc_codigo || '').trim();
    const sucNom = String(nombreSucursalActiva || '').trim().toLowerCase();

    const matches = todosDesgloses.filter(s => {
      const sId = Number(s.id_sucursal || 0);
      const sCod = String(s.suc_codigo || '').trim();
      const sNom = String(s.nombre_sucursal || '').trim().toLowerCase();

      if (sucId > 0 && sId === sucId) return true;
      if (sucCod && sCod === sucCod) return true;
      if (sucNom && (sNom.includes(sucNom) || sucNom.includes(sNom))) return true;
      return false;
    });

    if (matches.length > 0) return matches;

    // Fallback: sintetizar fila con valoresSucursal
    return [{
      nombre_sucursal: nombreSucursalActiva,
      cantidad_boletos: valoresSucursal?.cantidad_boletos || valores?.cantidad_boletos || 0,
      total_boletos: totalBoletos,
      porcentaje_retencion: valoresSucursal?.porcentaje_retencion || valores?.porcentaje_retencion || 0,
      retencion_calculada: totalRetenciones,
      retencion_monto: totalRetenciones
    }];
  }, [valores?.sucursales_desglose, isSucursal, sucursalActual, valoresSucursal, nombreSucursalActiva, totalBoletos, totalRetenciones]);

  const retencionesRaw = valores?.retenciones_detalle || [];
  const retenciones = [...retencionesRaw].sort((a, b) => {
    const grpA = Number(a.grupo ?? (a.cobro_total_despacho == 1 ? 0 : (a.tipo === 'DEUDA_SOCIO' ? 1 : 2)));
    const grpB = Number(b.grupo ?? (b.cobro_total_despacho == 1 ? 0 : (b.tipo === 'DEUDA_SOCIO' ? 1 : 2)));
    if (grpA !== grpB) return grpA - grpB;

    const prioA = Number(a.prioridad ?? 3);
    const prioB = Number(b.prioridad ?? 3);
    if (prioA !== prioB) return prioA - prioB;

    return Number(a.orden_secuencia || 0) - Number(b.orden_secuencia || 0);
  });

  const deudasItems = deudas?.items || [];

  // IDs de deudas del socio que ya están incluidas en retenciones (para no duplicar)
  const idsDeudaEnRetenciones = new Set(
    retenciones.filter(r => r.tipo === 'DEUDA_SOCIO').map(r => r.id)
  );

  // Solo mostrar en "Otras Deudas" las que NO están siendo cobradas en este viaje
  const deudasNoIncluidas = deudasItems.filter(d => !idsDeudaEnRetenciones.has(d.id_deuda));

  const getPrioridadBadge = (item) => {
    if (item.grupo === 0 || (item.tipo === 'DEUDA_SOCIO' && (item.prioridad || 1) <= 1) || item.cobro_total_despacho == 1) {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-rose-200">
          <i className="fas fa-bolt text-[9px]" /> 1° Multa (100% Boletos)
        </span>
      );
    }
    if (item.tipo === 'DEUDA_SOCIO') {
      return (
        <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-purple-200">
          <i className="fas fa-user-tag text-[9px]" /> Deuda Socio (Prio {item.prioridad || 1})
        </span>
      );
    }
    
    // Cobros de Unidad (Grupo 2)
    const prio = item.prioridad || 3;
    const prioLabels = {
      1: 'Orden 1 (Máxima)',
      2: 'Orden 2 (Alta)',
      3: 'Orden 3 (Media-Alta)',
      4: 'Orden 4 (Media)',
      5: 'Orden 5 (Media-Baja)',
      6: 'Orden 6 (Baja)',
      7: 'Orden 7 (Baja 2)',
      8: 'Orden 8 (Muy Baja)',
      9: 'Orden 9 (Muy Baja 2)',
      10: 'Orden 10 (Mínima)',
    };
    const label = prioLabels[prio] || `Orden ${prio}`;

    const colorClasses = {
      1: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      2: 'bg-blue-100 text-blue-800 border-blue-300',
      3: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      4: 'bg-amber-100 text-amber-800 border-amber-300',
      5: 'bg-amber-100/80 text-amber-700 border-amber-200',
      6: 'bg-slate-100 text-slate-700 border-slate-300',
      7: 'bg-slate-100 text-slate-700 border-slate-300',
      8: 'bg-slate-100 text-slate-600 border-slate-200',
      9: 'bg-slate-100 text-slate-600 border-slate-200',
      10: 'bg-slate-100 text-slate-500 border-slate-200',
    };
    const colorClass = colorClasses[prio] || 'bg-slate-100 text-slate-700 border-slate-200';

    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${colorClass}`}>
        <i className="fas fa-sort-amount-down text-[9px]" /> {label}
      </span>
    );
  };

  const tipoBadge = (item) => {
    if (item.tipo === 'COBRO_AUTOMATICO') return (
      <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-200">
        Automático
      </span>
    );
    if (item.tipo === 'DEUDA_SOCIO') return (
      <span className="bg-purple-50 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-purple-200">
        Deuda Socio
      </span>
    );
    return null;
  };

  const dotColor = (item) => {
    if (item.tipo === 'COBRO_AUTOMATICO') return 'bg-blue-500';
    if (item.tipo === 'DEUDA_SOCIO') return 'bg-purple-500';
    if (item.cobro_total_despacho == 1) return 'bg-rose-600';
    return 'bg-indigo-500';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between border-b border-slate-200 shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shadow-sm">
              <i className="fas fa-receipt text-lg" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <span>Desglose de Retenciones y Gastos</span>
                {isSucursal && (
                  <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                    {nombreSucursalActiva}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-medium">{viajeDesc} {unidad?.numero_unidad ? `— Bus ${unidad.numero_unidad}` : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Pestañas / Filtro Sucursal vs General dentro del Modal */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => setModoVista('SUCURSAL')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  modoVista === 'SUCURSAL'
                    ? 'bg-white text-blue-700 shadow-sm font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <i className="fas fa-building text-[10px]" />
                <span>Solo {nombreSucursalActiva}</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVista('GENERAL')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  modoVista === 'GENERAL'
                    ? 'bg-white text-blue-700 shadow-sm font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <i className="fas fa-globe text-[10px]" />
                <span>Consolidado General</span>
              </button>
            </div>

            <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors">
              <i className="fas fa-times text-sm" />
            </button>
          </div>
        </div>

        {/* Resumen Superior */}
        <div className="p-4 bg-gradient-to-r from-slate-50 via-rose-50/30 to-slate-50 border-b border-slate-200 shrink-0 grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm text-center">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
              Recaudación Boletos {isSucursal ? `(${nombreSucursalActiva})` : ''}
            </span>
            <span className="text-base font-black font-mono text-blue-900 mt-0.5 block">{fmt(totalBoletos)}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-rose-200 shadow-sm text-center">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
              Total Retenido {isSucursal ? `(${nombreSucursalActiva})` : ''}
            </span>
            <span className="text-base font-black font-mono text-rose-600 mt-0.5 block">-{fmt(totalRetenciones)}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm text-center">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              Neto a Entregar {isSucursal ? `(${nombreSucursalActiva})` : ''}
            </span>
            <span className="text-base font-black font-mono text-emerald-700 mt-0.5 block">{fmt(totalEntrega)}</span>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">

          {/* Desglose de Retenciones por Sucursal de Venta */}
          {sucursalesDesgloseFiltrado && sucursalesDesgloseFiltrado.length > 0 && (
            <div className="border border-blue-200 rounded-xl overflow-hidden bg-blue-50/20 shadow-sm">
              <div className="bg-blue-50/80 px-4 py-2.5 border-b border-blue-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fas fa-building text-blue-600 text-xs" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-900">
                    {isSucursal ? `Retención de Sucursal: ${nombreSucursalActiva}` : 'Retención por Sucursal / Oficina de Venta'}
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                  {sucursalesDesgloseFiltrado.length} {sucursalesDesgloseFiltrado.length === 1 ? 'sucursal' : 'sucursales'}
                </span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-blue-100 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                    <th className="px-3 py-2 text-left">Sucursal</th>
                    <th className="px-3 py-2 text-center w-24">Boletos</th>
                    <th className="px-3 py-2 text-right w-28">Total Venta</th>
                    <th className="px-3 py-2 text-center w-28">% Retención</th>
                    <th className="px-3 py-2 text-right w-28 text-rose-600">Retención</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {sucursalesDesgloseFiltrado.map((suc, sIdx) => (
                    <tr key={sIdx} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-3 py-2 font-bold text-slate-800 flex items-center gap-1.5">
                        <i className="fas fa-map-marker-alt text-blue-500 text-[10px]" />
                        {suc.nombre_sucursal || 'Oficina Principal'}
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-slate-700">
                        {suc.cantidad_boletos}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">
                        {fmt(suc.total_boletos)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="bg-indigo-50 text-indigo-700 font-mono font-black text-[10px] px-2 py-0.5 rounded-md border border-indigo-200">
                          {parseFloat(suc.porcentaje_retencion || 0).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-black text-rose-600 text-[12px]">
                        -{fmt(suc.retencion_calculada ?? suc.retencion_monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Banner de Jerarquía de Deducción */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <i className="fas fa-layer-group text-rose-500" />
              <span>Jerarquía de Descuento:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded border border-rose-200">1° Multas (100% Boletos)</span>
              <span className="text-slate-400">➔</span>
              <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded border border-purple-200">2° Deudas Socio</span>
              <span className="text-slate-400">➔</span>
              <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded border border-indigo-200">3° Cobros de Bus (Orden 1..10)</span>
            </div>
          </div>

          {/* Tabla de retenciones */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <i className="fas fa-list-ul text-rose-500" />
                Retenciones Aplicadas ({retenciones.length})
              </h4>
              <span className="text-[11px] font-medium text-slate-500">
                Ordenadas estrictamente según la prioridad configurada
              </span>
            </div>

            {retenciones.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400">
                <i className="fas fa-hand-holding-usd text-3xl text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">No hay retenciones aplicadas</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Este viaje no tiene comisiones ni cobros pendientes a descontar.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                      <th className="px-3 py-2.5 text-center w-14">Orden</th>
                      <th className="px-3 py-2.5 text-left">Concepto / Gasto</th>
                      <th className="px-3 py-2.5 text-center w-40">Prioridad Configurada</th>
                      <th className="px-3 py-2.5 text-right w-24">Deuda Total</th>
                      <th className="px-3 py-2.5 text-right w-24 text-rose-600">Se Cobra</th>
                      <th className="px-3 py-2.5 text-right w-28 text-amber-700">Saldo Restante</th>
                      <th className="px-3 py-2.5 text-center w-24">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {retenciones.map((item, idx) => {
                      const saldoRestante = parseFloat(item.saldo_restante ?? 0);
                      const montoCobrado = parseFloat(item.monto || 0);
                      const totalDeuda = montoCobrado + saldoRestante;
                      const fechaFmt = formatFecha(item.fecha);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          {/* Secuencia / Orden de cobro */}
                          <td className="px-3 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 border border-slate-300 font-mono font-bold text-slate-700 text-[11px]">
                              {idx + 1}
                            </span>
                          </td>

                          {/* Concepto + badges */}
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor(item)}`} />
                                <span className="font-bold text-slate-800">{item.nombre}</span>
                                {tipoBadge(item)}
                              </div>
                              {item.observacion && (
                                <span className="text-[10px] text-slate-400 pl-3.5 italic">{item.observacion}</span>
                              )}
                            </div>
                          </td>

                          {/* Prioridad Configurada */}
                          <td className="px-3 py-3 text-center">
                            {getPrioridadBadge(item)}
                          </td>

                          {/* Deuda Total */}
                          <td className="px-3 py-3 text-right font-mono text-slate-500 text-[11px]">
                            {fmt(totalDeuda)}
                          </td>

                          {/* Monto cobrado este viaje */}
                          <td className="px-3 py-3 text-right">
                            <span className="font-black font-mono text-rose-600 text-[12px]">-{fmt(montoCobrado)}</span>
                          </td>

                          {/* Saldo restante tras este cobro */}
                          <td className="px-3 py-3 text-right">
                            {saldoRestante > 0 ? (
                              <span className="font-bold font-mono text-amber-700 text-[11px] bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                                {fmt(saldoRestante)}
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                ✓ Saldado
                              </span>
                            )}
                          </td>

                          {/* Fecha */}
                          <td className="px-3 py-3 text-center font-mono text-[11px] text-slate-500">
                            {item.tipo === 'COBRO_AUTOMATICO' || item.tipo === 'DEUDA_SOCIO' ? (
                              <span className="text-blue-500 text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">En despacho</span>
                            ) : fechaFmt ? (
                              <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-slate-700 font-medium">
                                <i className="far fa-calendar-alt text-[9px] text-slate-400" />
                                {fechaFmt}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">Sin fecha</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-rose-50/60 border-t-2 border-rose-200 text-slate-800 font-extrabold">
                      <td colSpan={4} className="px-3 py-2.5 text-right uppercase tracking-wider text-[11px] text-rose-800">
                        Total Retenciones / Gastos Deducidos:
                      </td>
                      <td className="px-3 py-2.5 text-right font-black font-mono text-rose-700 text-sm">
                        -{fmt(totalRetenciones)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Deudas NO incluidas en este despacho */}
          {deudasNoIncluidas.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 mb-2.5 flex items-center gap-2">
                <i className="fas fa-exclamation-circle text-amber-500" />
                Deudas Pendientes NO Cobradas en este Viaje ({deudasNoIncluidas.length})
                <span className="text-[10px] font-medium text-slate-400 normal-case">— sin retención disponible</span>
              </h4>
              <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/30">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-amber-100/50 border-b border-amber-200 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                      <th className="px-4 py-2 text-left">Concepto / Tipo</th>
                      <th className="px-4 py-2 text-right w-32">Saldo Pendiente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {deudasNoIncluidas.map((d, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 font-medium text-slate-700">
                          {d.concepto || d.tipo_nombre || 'Deuda'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-black font-mono text-amber-800">
                          {fmt(d.saldo_pendiente)}
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
