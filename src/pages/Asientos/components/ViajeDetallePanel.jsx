export const ViajeDetallePanel = ({ viaje, modo, datos, pasajeros = [], resumen = null, loading, onClose }) => {
  const totalAsientos = resumen?.total_asientos || datos.length || parseInt(viaje.capacidad_buses) || 40;
  const ocupadosList = datos.filter(d => d.disponible == 0);
  const totalOcupados = resumen?.ocupados ?? (pasajeros.length > 0 ? pasajeros.length : ocupadosList.length);
  const totalLibres = resumen?.libres ?? Math.max(0, totalAsientos - totalOcupados);
  const totalDinero = (pasajeros.length > 0 ? pasajeros : ocupadosList).reduce((acc, p) => acc + parseFloat(p.valor || p.bol_valor || 0), 0);

  const fechaStr = viaje.fecha_salida || (viaje.via_orgesti ? viaje.via_orgesti.split(' ')[0] : '-');
  const horaStr = viaje.hora_salida || (viaje.via_orgesti && viaje.via_orgesti.split(' ')[1] ? viaje.via_orgesti.split(' ')[1] : '-');

  const renderAsientos = () => {
    const asientosList = datos && datos.length > 0 ? datos : Array.from({ length: totalAsientos }, (_, i) => ({
      asiento: i + 1,
      disponible: 1,
      cliente_nombre: 'Libre'
    }));

    return (
      <div className="p-4 flex flex-col items-center overflow-y-auto h-full">
        {/* Bus Cabin Container */}
        <div className="bg-slate-100 p-6 sm:p-7 rounded-3xl shadow-inner border border-slate-200 w-full max-w-md relative mb-6">
          {/* Cabina front header */}
          <div className="flex items-center justify-between border-b-2 border-dashed border-slate-300 pb-3 mb-5">
            <div className="flex items-center gap-2 text-slate-600 font-bold text-xs">
              <i className="fas fa-id-badge text-base text-slate-700"></i>
              <span>CHOFER: {viaje.per_chofer || 'Conductor'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              <i className="fas fa-bus"></i>
              <span>DISCO {viaje.bus_disco || '-'}</span>
            </div>
          </div>

          {/* Grilla de asientos */}
          <div className="relative grid grid-cols-4 gap-x-6 gap-y-5">
            {/* Pasillo central */}
            <div className="absolute left-1/2 top-0 bottom-0 w-4 -translate-x-1/2 bg-slate-200 rounded opacity-60 pointer-events-none"></div>

            {asientosList.map((asiento, idx) => {
              const isLibre = asiento.disponible == 1;
              const col = ((asiento.asiento - 1) % 4) + 1;
              const pasilloCls = col === 2 ? 'mr-3' : col === 3 ? 'ml-3' : '';

              return (
                <div
                  key={idx}
                  title={isLibre ? `Asiento #${asiento.asiento} - LIBRE` : `Asiento #${asiento.asiento} - OCUPADO por ${asiento.cliente_nombre || asiento.bol_nombre || 'Pasajero'}${asiento.destino || asiento.bol_destino ? ` (Destino: ${asiento.destino || asiento.bol_destino})` : ''}`}
                  className={`relative w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black text-sm shadow transition-transform hover:scale-105 cursor-pointer ${pasilloCls} ${
                    isLibre
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-b-4 border-emerald-700'
                      : 'bg-rose-500 hover:bg-rose-600 text-white border-b-4 border-rose-700'
                  }`}
                >
                  <span className="text-sm font-black leading-none">{asiento.asiento}</span>
                  <span className="text-[7.5px] uppercase tracking-tighter opacity-95 mt-0.5 font-bold">
                    {isLibre ? 'Libre' : 'Ocup.'}
                  </span>
                  {!isLibre && (
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[7.5px] font-bold text-slate-700 whitespace-nowrap bg-white border border-slate-200 px-1 py-0.2 rounded shadow-xs z-10 max-w-[64px] truncate">
                      {asiento.cliente_nombre || asiento.bol_nombre || 'Pasajero'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderPasajeros = () => {
    const list = pasajeros.length > 0 ? pasajeros : datos.filter(d => d.disponible == 0);

    return (
      <div className="overflow-y-auto flex-1 flex flex-col p-3">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <th className="px-3 py-2 text-center font-bold uppercase tracking-wider w-16">ASIENTO</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">IDENTIFICACIÓN</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">NOMBRES</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">DESTINO</th>
              <th className="px-3 py-2 text-right font-bold uppercase tracking-wider w-24">VALOR</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-12 text-slate-400 font-medium">No hay pasajeros registrados para este viaje.</td></tr>
            ) : (
              list.map((p, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 text-center font-black text-rose-600">
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200">#{p.asiento || p.bol_asiento}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-600">{p.identificacion || p.bol_cedula || '-'}</td>
                  <td className="px-3 py-2 font-bold text-slate-800">{p.cliente_nombre || p.bol_nombre || '-'}</td>
                  <td className="px-3 py-2 text-slate-600 font-medium">{p.destino || p.bol_destino || 'NORMAL'}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">${parseFloat(p.valor || p.bol_valor || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
          {list.length > 0 && (
            <tfoot className="sticky bottom-0 bg-slate-50 border-t-2 border-slate-300 font-bold">
              <tr>
                <td colSpan="3" className="px-3 py-2 text-slate-700">Total Pasajeros: {list.length}</td>
                <td className="px-3 py-2 text-right text-slate-700">Total Recaudado:</td>
                <td className="px-3 py-2 text-right text-emerald-600 font-mono">${totalDinero.toFixed(2)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  const headerBg = modo === 'asientos' ? 'bg-blue-600' : 'bg-slate-600';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`${headerBg} text-white px-5 py-3 flex items-center justify-between shrink-0`}>
        <h3 className="text-base font-bold flex items-center gap-2">
          <i className={modo === 'asientos' ? 'fas fa-bus-alt' : 'fas fa-users'}></i>
          {modo === 'asientos' ? 'Mapa de Asientos' : 'Manifiesto de Pasajeros'}
        </h3>
        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors text-lg">
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* Info del Viaje */}
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex gap-6 flex-wrap text-[11px] shrink-0">
        <div><span className="text-slate-400 text-[10px] block">Nº Viaje</span><b className="text-indigo-600 font-bold">#{viaje.via_codigo || viaje.id_viaje || '-'}</b></div>
        <div><span className="text-slate-400 text-[10px] block">Ruta</span><b>{viaje.rut_nombre || '-'}</b></div>
        <div><span className="text-slate-400 text-[10px] block">Disco Bus</span><b className="text-blue-600">{viaje.bus_disco || '-'}</b></div>
        <div><span className="text-slate-400 text-[10px] block">Chofer</span><b>{viaje.per_chofer || '-'}</b></div>
        <div><span className="text-slate-400 text-[10px] block">Fecha</span><b className="text-slate-700">{fechaStr}</b></div>
        <div><span className="text-slate-400 text-[10px] block">Hora Salida</span><b className="text-orange-600 font-bold">{horaStr}</b></div>
      </div>

      {/* Barra de Resumen de Asientos */}
      <div className="flex items-center justify-between px-5 py-2 bg-indigo-50/70 border-b border-indigo-100 text-xs flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Asientos Libres: {totalLibres}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            Asientos Ocupados: {totalOcupados}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-slate-600 border border-slate-200">
            <i className="fas fa-bus text-slate-400"></i>
            Total: {totalAsientos} asientos
          </span>
        </div>
        <div className="text-slate-600 text-xs font-semibold flex items-center gap-1">
          <i className="fas fa-clock text-orange-500"></i>
          <span>Hora Salida: <b className="text-orange-600 font-bold">{horaStr}</b></span>
        </div>
      </div>

      {/* Contenido Dinámico */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
            <div className="text-center text-slate-500">
              <i className="fas fa-circle-notch fa-spin fa-3x mb-2"></i>
              <p className="text-sm font-medium">Cargando información...</p>
            </div>
          </div>
        )}

        {modo === 'asientos' ? renderAsientos() : renderPasajeros()}
      </div>
    </div>
  );
};
